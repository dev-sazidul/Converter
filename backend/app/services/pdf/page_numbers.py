"""Add customizable page numbers to a PDF."""

from __future__ import annotations

import re
from pathlib import Path

import pymupdf

from app.errors import AppError, InvalidOptionError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name
from app.services.pdf.ranges import parse_pages

_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")

POSITIONS = {
    "bottom-center",
    "bottom-left",
    "bottom-right",
    "top-center",
    "top-left",
    "top-right",
}
FORMATS = {"number", "page_of_total", "page_n", "page_n_of_total"}
FONTS = {"helv", "tiro", "cour"}


def parse_hex_color(value: str, default: tuple[float, float, float] = (0.2, 0.25, 0.33)) -> tuple[float, float, float]:
    cleaned = (value or "").strip()
    if not cleaned:
        return default
    if not _HEX_COLOR.match(cleaned):
        raise InvalidOptionError("Enter a valid hex color such as #334155.")
    r = int(cleaned[1:3], 16) / 255.0
    g = int(cleaned[3:5], 16) / 255.0
    b = int(cleaned[5:7], 16) / 255.0
    return (r, g, b)


def _format_label(fmt: str, display_num: int, total_display: int) -> str:
    if fmt == "page_of_total":
        return f"{display_num} / {total_display}"
    if fmt == "page_n":
        return f"Page {display_num}"
    if fmt == "page_n_of_total":
        return f"Page {display_num} of {total_display}"
    return str(display_num)


def add_page_numbers(
    source: SavedFile,
    directory: Path,
    *,
    position: str,
    fmt: str,
    start_number: int,
    font: str,
    font_size: int,
    color: str,
    pages: str,
    margin: int = 24,
) -> ProcessResult:
    if position not in POSITIONS:
        raise InvalidOptionError("Choose a valid page number position.")
    if fmt not in FORMATS:
        raise InvalidOptionError("Choose a valid page number format.")
    if font not in FONTS:
        raise InvalidOptionError("Choose Helvetica, Times, or Courier.")
    if not (1 <= start_number <= 10000):
        raise InvalidOptionError("Starting number must be between 1 and 10000.")
    if not (8 <= font_size <= 36):
        raise InvalidOptionError("Font size must be between 8 and 36.")
    rgb = parse_hex_color(color)

    output = directory / "output.pdf"
    try:
        doc = pymupdf.open(source.path)
        try:
            selected = set(parse_pages(pages, doc.page_count))
            total_selected = len(selected)
            total_for_label = start_number + doc.page_count - 1
            numbered_count = 0

            for idx in range(doc.page_count):
                if idx not in selected:
                    continue
                page = doc[idx]
                rect = page.rect
                display_num = start_number + idx
                label = _format_label(fmt, display_num, total_for_label)
                text_width = pymupdf.get_text_length(label, fontname=font, fontsize=font_size)

                safe_margin = min(margin, max(8.0, min(rect.width, rect.height) * 0.15))
                if position.endswith("left"):
                    x = rect.x0 + safe_margin
                elif position.endswith("right"):
                    x = rect.x1 - safe_margin - text_width
                else:
                    x = rect.x0 + (rect.width - text_width) / 2.0

                if position.startswith("top"):
                    y = rect.y0 + safe_margin + font_size
                else:
                    y = rect.y1 - safe_margin

                page.insert_text(
                    pymupdf.Point(x, y),
                    label,
                    fontname=font,
                    fontsize=font_size,
                    color=rgb,
                )
                numbered_count += 1

            doc.save(output, garbage=3, deflate=True)
            page_count = int(doc.page_count)
        finally:
            doc.close()
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError("We couldn't add page numbers to that PDF.") from exc

    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name)}-numbered.pdf",
        media_type="application/pdf",
        meta={
            "page_count": page_count,
            "numbered_pages": total_selected,
            "output_kind": "pdf",
        },
    )
