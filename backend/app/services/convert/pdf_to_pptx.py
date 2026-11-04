"""Turn PDF pages into a PowerPoint deck.

Editable mode places selectable text and embedded images on the slide.
Picture mode renders each page, so the layout matches and the text is not editable.
A page with no selectable text in editable mode is saved as a picture and the
result says the deck is mixed.
"""

from __future__ import annotations

import zipfile
from io import BytesIO
from pathlib import Path

import pymupdf
from pptx import Presentation
from pptx.util import Emu, Pt

from app.errors import AppError, InvalidOptionError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name
from app.services.pdf.render import page_pixmap

_POINT = 12700


def pdf_to_pptx(source: SavedFile, directory: Path, *, mode: str) -> ProcessResult:
    if mode not in {"editable", "image"}:
        raise InvalidOptionError("Choose editable text or a picture of each page.")
    destination = directory / "output.pptx"
    picture_pages = 0
    text_pages = 0
    try:
        pdf = pymupdf.open(source.path)
        try:
            first = pdf[0].rect
            presentation = Presentation()
            presentation.slide_width = Emu(max(first.width, 1) * _POINT)
            presentation.slide_height = Emu(max(first.height, 1) * _POINT)
            blank = presentation.slide_layouts[6]
            for page in pdf:
                slide = presentation.slides.add_slide(blank)
                if mode == "image":
                    _add_page_picture(slide, page, presentation.slide_width, presentation.slide_height)
                    picture_pages += 1
                    continue
                placed = _add_editable(slide, page, presentation.slide_width, presentation.slide_height)
                if placed:
                    text_pages += 1
                else:
                    _add_page_picture(slide, page, presentation.slide_width, presentation.slide_height)
                    picture_pages += 1
        finally:
            pdf.close()
        presentation.save(destination)
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError(
            "We couldn't build a PowerPoint file from this PDF. It may be damaged or use an unsupported feature."
        ) from exc
    _require_pptx(destination)
    if mode == "image" or text_pages == 0:
        result_mode = "image"
        note = "Each slide is a picture of a PDF page, so the layout matches and the text is not editable."
    elif picture_pages:
        result_mode = "mixed"
        note = "Pages with selectable text use editable text. Pages without it were saved as pictures."
    else:
        result_mode = "editable"
        note = "Slides use editable text from the PDF. Complex layouts may not match the original."
    return ProcessResult(
        path=destination,
        download_name=f"{stem_name(source.display_name, 'slides')}.pptx",
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        meta={
            "output_kind": "pptx",
            "page_count": int(source.pages or 0),
            "mode": result_mode,
            "picture_pages": picture_pages,
            "note": note,
        },
    )


def _add_editable(slide, page: pymupdf.Page, slide_width: int, slide_height: int) -> bool:
    # The first page defines the slide size. Later pages are scaled to fit it.
    scale = min(int(slide_width) / max(page.rect.width, 1), int(slide_height) / max(page.rect.height, 1))
    try:
        data = page.get_text("dict")
    except Exception:
        return False
    placed = False
    for block in data.get("blocks", []):
        bbox = block.get("bbox") or (0, 0, 0, 0)
        if block.get("type") == 1 and isinstance(block.get("image"), (bytes, bytearray)):
            _add_picture_bytes(slide, bytes(block["image"]), bbox, scale)
            placed = True
            continue
        if block.get("type") != 0:
            continue
        for line in block.get("lines") or []:
            spans = line.get("spans") or []
            text = "".join(str(span.get("text") or "") for span in spans).strip()
            if not text:
                continue
            line_box = line.get("bbox") or bbox
            _add_text(slide, text, line_box, scale, spans[0] if spans else {})
            placed = True
    return placed


def _add_text(slide, text: str, bbox, scale: float, span: dict) -> None:
    left, top, right, bottom = [float(value) for value in bbox]
    width = max((right - left) * scale, 20 * _POINT)
    height = max((bottom - top) * scale, 14 * _POINT)
    box = slide.shapes.add_textbox(Emu(left * scale), Emu(top * scale), Emu(width), Emu(height))
    paragraph = box.text_frame.paragraphs[0]
    paragraph.text = text
    size = float(span.get("size") or 12)
    paragraph.font.size = Pt(max(8, min(size, 36)))
    box.text_frame.word_wrap = True


def _add_picture_bytes(slide, raw: bytes, bbox, scale: float) -> None:
    left, top, right, bottom = [float(value) for value in bbox]
    try:
        slide.shapes.add_picture(
            BytesIO(raw),
            Emu(left * scale),
            Emu(top * scale),
            Emu(max((right - left) * scale, 1)),
            Emu(max((bottom - top) * scale, 1)),
        )
    except Exception:
        return


def _add_page_picture(slide, page: pymupdf.Page, slide_width: int, slide_height: int) -> None:
    pixmap, _reduced = page_pixmap(page, 110)
    image = pixmap.tobytes("jpeg")
    slide.shapes.add_picture(BytesIO(image), Emu(0), Emu(0), slide_width, slide_height)


def _require_pptx(path: Path) -> None:
    if not path.is_file() or path.stat().st_size <= 0:
        raise ProcessingFailedError("We couldn't build a PowerPoint file from this PDF.")
    try:
        with zipfile.ZipFile(path) as archive:
            names = archive.namelist()
            if "ppt/presentation.xml" not in names:
                raise ProcessingFailedError("We couldn't build a PowerPoint file from this PDF.")
    except zipfile.BadZipFile as exc:
        raise ProcessingFailedError("We couldn't build a PowerPoint file from this PDF.") from exc
