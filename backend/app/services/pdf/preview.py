"""Render a single PDF page preview and extract selectable text lines for Edit/Sign UIs."""

from __future__ import annotations

import base64
from pathlib import Path
from typing import Any

import pymupdf

from app.errors import AppError, InvalidOptionError, ProcessingFailedError
from app.services.pdf.render import page_pixmap


def render_page_preview(
    pdf_path: Path,
    *,
    page_number: int,
    max_pixels: int,
    include_text: bool = False,
) -> dict[str, Any]:
    try:
        doc = pymupdf.open(pdf_path)
        try:
            page_count = int(doc.page_count)
            if page_number < 1 or page_number > page_count:
                raise InvalidOptionError(
                    f"Page {page_number} is out of range (1–{page_count})."
                )
            page = doc[page_number - 1]
            rect = page.rect
            pix, _ = page_pixmap(page, dpi=110, max_pixels=max_pixels)
            jpeg_bytes = pix.tobytes("jpeg", jpg_quality=82)
            data_url = "data:image/jpeg;base64," + base64.b64encode(jpeg_bytes).decode("ascii")

            text_blocks: list[dict[str, Any]] = []
            if include_text and rect.width > 0 and rect.height > 0:
                info = page.get_text("dict")
                for block in info.get("blocks", []):
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        spans = line.get("spans", [])
                        text = "".join(span.get("text", "") for span in spans).strip()
                        if not text:
                            continue
                        bbox = line.get("bbox", (0, 0, 0, 0))
                        x0, y0, x1, y1 = bbox
                        first = spans[0] if spans else {}
                        font_size = round(float(first.get("size", 12.0)), 1)
                        text_blocks.append(
                            {
                                "text": text[:300],
                                "x": round(max(0.0, (x0 - rect.x0) / rect.width), 4),
                                "y": round(max(0.0, (y0 - rect.y0) / rect.height), 4),
                                "w": round(min(1.0, max(0.02, (x1 - x0) / rect.width)), 4),
                                "h": round(min(1.0, max(0.015, (y1 - y0) / rect.height)), 4),
                                "font_size": max(6.0, min(72.0, font_size)),
                            }
                        )
                        if len(text_blocks) >= 150:
                            break
                    if len(text_blocks) >= 150:
                        break

            return {
                "page": page_number,
                "page_count": page_count,
                "width": round(float(rect.width), 2),
                "height": round(float(rect.height), 2),
                "image": data_url,
                "text_blocks": text_blocks,
            }
        finally:
            doc.close()
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError("We couldn't render a preview for that PDF.") from exc
