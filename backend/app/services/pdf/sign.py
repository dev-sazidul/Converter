"""Apply a visual signature image onto selected PDF pages."""

from __future__ import annotations

import io
import json
from pathlib import Path

import pymupdf
from PIL import Image

from app.errors import AppError, InvalidOptionError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name


def _parse_placements(raw: str, page_count: int) -> list[dict[str, float | int]]:
    try:
        items = json.loads(raw)
    except Exception as exc:
        raise InvalidOptionError("Invalid signature placement data.") from exc
    if not isinstance(items, list) or len(items) == 0:
        raise InvalidOptionError("Place your signature on at least one page before applying.")
    if len(items) > 50:
        raise InvalidOptionError("Too many signature placements (maximum 50).")

    parsed: list[dict[str, float | int]] = []
    for item in items:
        if not isinstance(item, dict):
            raise InvalidOptionError("Invalid signature placement entry.")
        try:
            page = int(item["page"])
            x = float(item["x"])
            y = float(item["y"])
            w = float(item["width"])
            h = float(item["height"])
        except (KeyError, TypeError, ValueError) as exc:
            raise InvalidOptionError("Invalid signature coordinates.") from exc
        if page < 1 or page > page_count:
            raise InvalidOptionError(f"Page {page} is outside this PDF (1–{page_count}).")
        if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.02 <= w <= 1.0 and 0.02 <= h <= 1.0):
            raise InvalidOptionError("Signature size and position must stay within the page.")
        parsed.append({"page": page, "x": x, "y": y, "width": w, "height": h})
    return parsed


def sign_pdf(
    source: SavedFile,
    signature_image: SavedFile,
    directory: Path,
    *,
    placements_json: str,
) -> ProcessResult:
    output = directory / "output.pdf"
    try:
        with Image.open(signature_image.path) as raw_img:
            rgba = raw_img.convert("RGBA")
            buf = io.BytesIO()
            rgba.save(buf, format="PNG")
            sig_bytes = buf.getvalue()

        doc = pymupdf.open(source.path)
        try:
            placements = _parse_placements(placements_json, doc.page_count)
            for item in placements:
                page = doc[int(item["page"]) - 1]
                rect = page.rect
                x0 = rect.x0 + float(item["x"]) * rect.width
                y0 = rect.y0 + float(item["y"]) * rect.height
                x1 = min(rect.x1, x0 + float(item["width"]) * rect.width)
                y1 = min(rect.y1, y0 + float(item["height"]) * rect.height)
                if x1 <= x0 or y1 <= y0:
                    continue
                page.insert_image(pymupdf.Rect(x0, y0, x1, y1), stream=sig_bytes, overlay=True)

            doc.save(output, garbage=3, deflate=True)
            page_count = int(doc.page_count)
        finally:
            doc.close()
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError("We couldn't sign that PDF. Please try again.") from exc

    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name)}-signed.pdf",
        media_type="application/pdf",
        meta={
            "page_count": page_count,
            "signatures_applied": len(placements),
            "signature_type": "visual",
            "output_kind": "pdf",
        },
    )
