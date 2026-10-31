"""Extract PDF tables into an XLSX workbook.

Pages without a detected table contribute their selectable text as rows.
A scanned page with no text and no table fails with an explanation.
"""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

import pymupdf
from openpyxl import Workbook

from app.errors import AppError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name

_INVALID_SHEET = re.compile(r"[\[\]:*?/\\]")


def pdf_to_excel(source: SavedFile, directory: Path) -> ProcessResult:
    destination = directory / "output.xlsx"
    try:
        pdf = pymupdf.open(source.path)
        workbook = Workbook()
        default = workbook.active
        used = False
        tables_found = 0
        text_sheets = 0
        try:
            for index, page in enumerate(pdf, start=1):
                tables = _tables(page)
                if tables:
                    for table_index, rows in enumerate(tables, start=1):
                        sheet = default if not used else workbook.create_sheet()
                        used = True
                        sheet.title = _title(f"Page {index} table {table_index}")
                        _write_rows(sheet, rows)
                        tables_found += 1
                    continue
                lines = [line.strip() for line in page.get_text("text").splitlines() if line.strip()]
                if not lines:
                    continue
                sheet = default if not used else workbook.create_sheet()
                used = True
                sheet.title = _title(f"Page {index} text")
                sheet["A1"] = "No table was detected on this page. Selectable text is listed below."
                for row_index, line in enumerate(lines, start=3):
                    sheet.cell(row_index, 1, _cell(line))
                text_sheets += 1
        finally:
            pdf.close()
        if not used:
            raise ProcessingFailedError(
                "This PDF doesn't contain a table or selectable text. Scanned pages need OCR, which this tool doesn't do."
            )
        if not tables_found:
            default.title = "Text"
        workbook.save(destination)
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError(
            "We couldn't build a spreadsheet from this PDF. It may be damaged or use an unsupported feature."
        ) from exc
    _require_xlsx(destination)
    if tables_found:
        note = f"Extracted {tables_found} tables. Complex layouts may not match the PDF."
        mode = "tables"
    else:
        note = "No table was found, so selectable text was placed in rows. Complex layouts may not match the PDF."
        mode = "text"
    return ProcessResult(
        path=destination,
        download_name=f"{stem_name(source.display_name, 'spreadsheet')}.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        meta={
            "output_kind": "xlsx",
            "page_count": int(source.pages or 0),
            "tables_found": tables_found,
            "text_sheets": text_sheets,
            "mode": mode,
            "note": note,
        },
    )


def _tables(page: pymupdf.Page) -> list[list[list[object]]]:
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
    collected: list[list[list[object]]] = []
    for table in raw:
        try:
            rows = table.extract()
        except Exception:
            continue
        if rows and any(any(cell not in (None, "") for cell in row) for row in rows):
            collected.append(rows)
    return collected


def _write_rows(sheet, rows: list[list[object]]) -> None:
    for row_index, row in enumerate(rows, start=1):
        for column_index, value in enumerate(row, start=1):
            sheet.cell(row_index, column_index, _cell(value))


def _cell(value: object):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    if re.fullmatch(r"-?\d+\.\d+", text):
        return float(text)
    return text


def _title(name: str) -> str:
    cleaned = _INVALID_SHEET.sub(" ", name).strip() or "Sheet"
    return cleaned[:31]


def _require_xlsx(path: Path) -> None:
    if not path.is_file() or path.stat().st_size <= 0:
        raise ProcessingFailedError("We couldn't build a spreadsheet from this PDF.")
    try:
        with zipfile.ZipFile(path) as archive:
            if "xl/workbook.xml" not in archive.namelist():
                raise ProcessingFailedError("We couldn't build a spreadsheet from this PDF.")
    except zipfile.BadZipFile as exc:
        raise ProcessingFailedError("We couldn't build a spreadsheet from this PDF.") from exc
