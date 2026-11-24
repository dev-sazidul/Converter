"""Edit PDF: add text, images, annotations, and replace selectable text blocks."""

from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any

import pymupdf
from PIL import Image

from app.errors import AppError, InvalidOptionError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name
from app.services.pdf.page_numbers import FONTS, parse_hex_color


def _parse_operations(raw: str, page_count: int, image_count: int) -> list[dict[str, Any]]:
    try:
        items = json.loads(raw)
    except Exception as exc:
        raise InvalidOptionError("Invalid edit operations payload.") from exc
    if not isinstance(items, list) or len(items) == 0:
        raise InvalidOptionError("Add at least one edit (text, image, highlight, or text replacement) before saving.")
    if len(items) > 200:
        raise InvalidOptionError("Too many edit elements (maximum 200 per task).")

    cleaned: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            raise InvalidOptionError("Invalid edit element.")
        kind = str(item.get("type", "")).strip().lower()
        if kind not in {"text", "image", "rect", "replace_text"}:
            raise InvalidOptionError("Unsupported edit element type.")
        try:
            page = int(item["page"])
            x = float(item["x"])
            y = float(item["y"])
            w = float(item["width"])
            h = float(item["height"])
        except (KeyError, TypeError, ValueError) as exc:
            raise InvalidOptionError("Invalid element position or size.") from exc
        if page < 1 or page > page_count:
            raise InvalidOptionError(f"Page {page} is outside this PDF (1–{page_count}).")
        if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.01 <= w <= 1.0 and 0.01 <= h <= 1.0):
            raise InvalidOptionError("Element coordinates must stay within the page.")

        entry: dict[str, Any] = {"type": kind, "page": page, "x": x, "y": y, "width": w, "height": h}
        if kind in {"text", "replace_text"}:
            text = str(item.get("text", "")).strip()
            if not text or len(text) > 2000:
                raise InvalidOptionError("Text elements must contain between 1 and 2000 characters.")
            font_size = float(item.get("font_size", 14))
            font_size = max(6.0, min(72.0, font_size))
            font = str(item.get("font", "helv")).strip().lower()
            if font not in FONTS:
                font = "helv"
            color = parse_hex_color(str(item.get("color", "#132421")), default=(0.07, 0.14, 0.13))
            entry.update({"text": text, "font_size": font_size, "font": font, "color": color})
        elif kind == "rect":
            color = parse_hex_color(str(item.get("color", "#FDE047")), default=(0.99, 0.88, 0.28))
            opacity = max(0.05, min(1.0, float(item.get("opacity", 0.35))))
            filled = bool(item.get("filled", True))
            entry.update({"color": color, "opacity": opacity, "filled": filled})
        elif kind == "image":
            try:
                img_idx = int(item["image_index"])
            except (KeyError, TypeError, ValueError) as exc:
                raise InvalidOptionError("Missing image reference for image element.") from exc
            if img_idx < 0 or img_idx >= image_count:
                raise InvalidOptionError("Referenced image upload is missing.")
            entry["image_index"] = img_idx
        cleaned.append(entry)
    return cleaned


def edit_pdf(
    source: SavedFile,
    directory: Path,
    *,
    operations_json: str,
    image_files: list[SavedFile],
) -> ProcessResult:
    output = directory / "output.pdf"
    try:
        prepared_images: list[bytes] = []
        for img_file in image_files:
            with Image.open(img_file.path) as raw_img:
                rgba = raw_img.convert("RGBA")
                buf = io.BytesIO()
                rgba.save(buf, format="PNG")
                prepared_images.append(buf.getvalue())

        doc = pymupdf.open(source.path)
        try:
            ops = _parse_operations(operations_json, doc.page_count, len(prepared_images))

            # Apply text replacements first (redaction patches), then overlays.
            for op in ops:
                if op["type"] != "replace_text":
                    continue
                page = doc[op["page"] - 1]
                pr = page.rect
                box = pymupdf.Rect(
                    pr.x0 + op["x"] * pr.width,
                    pr.y0 + op["y"] * pr.height,
                    min(pr.x1, pr.x0 + (op["x"] + op["width"]) * pr.width),
                    min(pr.y1, pr.y0 + (op["y"] + op["height"]) * pr.height),
                )
                page.add_redact_annot(box, fill=(1, 1, 1))
                page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
                page.insert_textbox(
                    box,
                    op["text"],
                    fontname=op["font"],
                    fontsize=op["font_size"],
                    color=op["color"],
                )

            for op in ops:
                if op["type"] == "replace_text":
                    continue
                page = doc[op["page"] - 1]
                pr = page.rect
                box = pymupdf.Rect(
                    pr.x0 + op["x"] * pr.width,
                    pr.y0 + op["y"] * pr.height,
                    min(pr.x1, pr.x0 + (op["x"] + op["width"]) * pr.width),
                    min(pr.y1, pr.y0 + (op["y"] + op["height"]) * pr.height),
                )
                if op["type"] == "rect":
                    page.draw_rect(
                        box,
                        color=op["color"],
                        fill=op["color"] if op["filled"] else None,
                        fill_opacity=op["opacity"] if op["filled"] else 0.0,
                        stroke_opacity=min(1.0, op["opacity"] + 0.35),
                        width=1.5,
                    )
                elif op["type"] == "text":
                    page.insert_textbox(
                        box,
                        op["text"],
                        fontname=op["font"],
                        fontsize=op["font_size"],
                        color=op["color"],
                    )
                elif op["type"] == "image":
                    page.insert_image(
                        box,
                        stream=prepared_images[op["image_index"]],
                        overlay=True,
                    )

            doc.save(output, garbage=3, deflate=True)
            page_count = int(doc.page_count)
        finally:
            doc.close()
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError("We couldn't save edits to that PDF. Please try again.") from exc

    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name)}-edited.pdf",
        media_type="application/pdf",
        meta={
            "page_count": page_count,
            "edits_applied": len(ops),
            "output_kind": "pdf",
        },
    )
