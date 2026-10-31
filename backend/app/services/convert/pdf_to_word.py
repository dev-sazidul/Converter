"""Copy PDF text, tables, and images into a DOCX file.

Layout is reconstructed from reading order. Columns, headers, and exact
positions are not guaranteed, and the tool says so in the result note.
"""

from __future__ import annotations

import zipfile
from io import BytesIO
from pathlib import Path

import pymupdf
from docx import Document
from docx.shared import Inches, Pt

from app.errors import AppError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name

_NOTE = "Text, tables, and images were copied into Word. Complex layouts may not match the PDF."


def pdf_to_word(source: SavedFile, directory: Path) -> ProcessResult:
    destination = directory / "output.docx"
    try:
        document = Document()
        pdf = pymupdf.open(source.path)
        try:
            for index, page in enumerate(pdf):
                if index:
                    document.add_page_break()
                _write_page(document, page)
        finally:
            pdf.close()
        document.save(destination)
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError(
            "We couldn't build a Word file from this PDF. It may be damaged or use an unsupported feature."
        ) from exc
    _require_docx(destination)
    return ProcessResult(
        path=destination,
        download_name=f"{stem_name(source.display_name, 'document')}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        meta={
            "output_kind": "docx",
            "page_count": int(source.pages or 0),
            "note": _NOTE,
        },
    )


def _write_page(document: Document, page: pymupdf.Page) -> None:
    tables = _tables(page)
    table_boxes = [box for box, _rows in tables if box is not None]
    events: list[tuple[float, str, object]] = []
    for box, rows in tables:
        events.append((float(box[1]) if box else 0.0, "table", rows))
    try:
        data = page.get_text("dict")
    except Exception as exc:
        raise ProcessingFailedError(
            "We couldn't read the text in this PDF. It may be damaged."
        ) from exc
    for block in data.get("blocks", []):
        bbox = block.get("bbox") or (0, 0, 0, 0)
        if _covered(bbox, table_boxes):
            continue
        events.append((float(bbox[1]), "block", block))
    events.sort(key=lambda item: item[0])
    for _top, kind, payload in events:
        if kind == "table":
            _add_table(document, payload)
        else:
            _add_block(document, payload)


def _tables(page: pymupdf.Page) -> list[tuple[object, list]]:
    try:
        found = page.find_tables(snap_tolerance=3)
    except Exception:
        return []
    raw = getattr(found, "tables", None)
    if raw is None:
        try:
            raw = list(found)
        except TypeError:
            return []
    collected: list[tuple[object, list]] = []
    for table in raw:
        try:
            rows = table.extract()
        except Exception:
            continue
        if rows:
            collected.append((getattr(table, "bbox", None), rows))
    return collected


def _covered(bbox: object, boxes: list[object]) -> bool:
    if not boxes:
        return False
    area = pymupdf.Rect(bbox)
    if area.is_empty or area.get_area() <= 0:
        return False
    for box in boxes:
        intersection = area & pymupdf.Rect(box)
        if not intersection.is_empty and intersection.get_area() / area.get_area() > 0.45:
            return True
    return False


def _add_table(document: Document, rows: object) -> None:
    if not isinstance(rows, list) or not rows:
        return
    cleaned = [["" if cell is None else str(cell).strip() for cell in row] for row in rows if isinstance(row, list)]
    cleaned = [row for row in cleaned if any(cell for cell in row)]
    if not cleaned:
        return
    width = max(len(row) for row in cleaned)
    table = document.add_table(rows=len(cleaned), cols=width)
    try:
        table.style = "Table Grid"
    except KeyError:
        pass
    for row_index, row in enumerate(cleaned):
        for column_index in range(width):
            value = row[column_index] if column_index < len(row) else ""
            table.rows[row_index].cells[column_index].text = value
    document.add_paragraph("")


def _add_block(document: Document, block: object) -> None:
    if not isinstance(block, dict):
        return
    if block.get("type") == 1:
        raw = block.get("image")
        if isinstance(raw, (bytes, bytearray)) and raw:
            _add_image(document, bytes(raw), block.get("bbox"))
        return
    if block.get("type") != 0:
        return
    lines: list[str] = []
    size = 12
    bold = False
    for line in block.get("lines") or []:
        spans = line.get("spans") or []
        text = "".join(str(span.get("text") or "") for span in spans).strip()
        if text:
            lines.append(text)
        if spans:
            size = int(spans[0].get("size") or size)
            bold = bool(int(spans[0].get("flags") or 0) & 16)
    paragraph_text = "\n".join(lines).strip()
    if not paragraph_text:
        return
    paragraph = document.add_paragraph()
    run = paragraph.add_run(paragraph_text)
    run.bold = bold
    run.font.size = Pt(max(8, min(size, 28)))


def _add_image(document: Document, raw: bytes, bbox: object) -> None:
    width = 6.0
    if isinstance(bbox, (list, tuple)) and len(bbox) >= 4:
        width = max(0.5, min(6.5, (float(bbox[2]) - float(bbox[0])) / 72))
    try:
        document.add_picture(BytesIO(raw), width=Inches(width))
    except Exception:
        return


def _require_docx(path: Path) -> None:
    if not path.is_file() or path.stat().st_size <= 0:
        raise ProcessingFailedError("We couldn't build a Word file from this PDF.")
    try:
        with zipfile.ZipFile(path) as archive:
            if "word/document.xml" not in archive.namelist():
                raise ProcessingFailedError("We couldn't build a Word file from this PDF.")
    except zipfile.BadZipFile as exc:
        raise ProcessingFailedError("We couldn't build a Word file from this PDF.") from exc
