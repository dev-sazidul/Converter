"""Add text or image watermarks to selected PDF pages."""

from __future__ import annotations

import io
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw, ImageFont

from app.errors import AppError, InvalidOptionError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name
from app.services.pdf.page_numbers import parse_hex_color
from app.services.pdf.ranges import parse_pages

POSITIONS = {
    "center",
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
    "tile",
}


def _place_rect(
    page_rect: pymupdf.Rect,
    box_w: float,
    box_h: float,
    position: str,
    margin: float = 28.0,
) -> list[pymupdf.Rect]:
    if position == "tile":
        rects: list[pymupdf.Rect] = []
        step_x = max(box_w * 1.4, page_rect.width / 2.5)
        step_y = max(box_h * 1.6, page_rect.height / 3.0)
        y = page_rect.y0 + margin
        while y < page_rect.y1 - margin:
            x = page_rect.x0 + margin
            while x < page_rect.x1 - margin:
                rects.append(pymupdf.Rect(x, y, x + box_w, y + box_h))
                x += step_x
            y += step_y
        return rects or [pymupdf.Rect(0, 0, box_w, box_h)]

    if position.endswith("left"):
        x0 = page_rect.x0 + margin
    elif position.endswith("right"):
        x0 = page_rect.x1 - margin - box_w
    else:
        x0 = page_rect.x0 + (page_rect.width - box_w) / 2.0

    if position.startswith("top"):
        y0 = page_rect.y0 + margin
    elif position.startswith("bottom"):
        y0 = page_rect.y1 - margin - box_h
    else:
        y0 = page_rect.y0 + (page_rect.height - box_h) / 2.0

    return [pymupdf.Rect(x0, y0, x0 + box_w, y0 + box_h)]


def _render_text_stamp(
    text: str,
    font_size: int,
    rgb: tuple[float, float, float],
    opacity: float,
    rotation: int,
) -> tuple[bytes, float, float]:
    """Render a crisp RGBA PNG stamp for text so rotation + opacity work uniformly."""
    scale = 2
    px_size = font_size * scale
    try:
        pil_font = ImageFont.truetype("DejaVuSans-Bold.ttf", px_size)
    except OSError:
        try:
            pil_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", px_size)
        except OSError:
            pil_font = ImageFont.load_default()

    dummy = Image.new("RGBA", (10, 10))
    draw = ImageDraw.Draw(dummy)
    bbox = draw.textbbox((0, 0), text, font=pil_font)
    tw = max(1, bbox[2] - bbox[0])
    th = max(1, bbox[3] - bbox[1])
    pad = int(px_size * 0.35)

    img = Image.new("RGBA", (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r, g, b = (int(rgb[0] * 255), int(rgb[1] * 255), int(rgb[2] * 255))
    alpha = max(1, min(255, int(round(opacity * 255))))
    draw.text((pad - bbox[0], pad - bbox[1]), text, font=pil_font, fill=(r, g, b, alpha))

    if rotation != 0:
        img = img.rotate(-rotation, expand=True, resample=Image.Resampling.BICUBIC)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue(), img.width / scale, img.height / scale


def _render_image_stamp(
    image_path: Path,
    opacity: float,
    rotation: int,
) -> tuple[bytes, int, int]:
    with Image.open(image_path) as raw:
        img = raw.convert("RGBA")
        if opacity < 1.0:
            r, g, b, a = img.split()
            a = a.point(lambda val: int(round(val * opacity)))
            img = Image.merge("RGBA", (r, g, b, a))
        if rotation != 0:
            img = img.rotate(-rotation, expand=True, resample=Image.Resampling.BICUBIC)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue(), img.width, img.height


def add_watermark(
    source: SavedFile,
    directory: Path,
    *,
    mode: str,
    text: str,
    font_size: int,
    color: str,
    opacity: float,
    rotation: int,
    position: str,
    pages: str,
    scale: float,
    image_file: SavedFile | None = None,
) -> ProcessResult:
    if mode not in {"text", "image"}:
        raise InvalidOptionError("Choose a text or image watermark.")
    if position not in POSITIONS:
        raise InvalidOptionError("Choose a valid watermark position.")
    if not (0.05 <= opacity <= 1.0):
        raise InvalidOptionError("Opacity must be between 5% and 100%.")
    if not (-90 <= rotation <= 90):
        raise InvalidOptionError("Rotation must be between -90 and 90 degrees.")

    if mode == "text":
        cleaned_text = (text or "").strip()
        if not cleaned_text or len(cleaned_text) > 120:
            raise InvalidOptionError("Enter watermark text between 1 and 120 characters.")
        if not (12 <= font_size <= 120):
            raise InvalidOptionError("Font size must be between 12 and 120.")
        rgb = parse_hex_color(color, default=(0.05, 0.37, 0.35))
        stamp_bytes, base_w, base_h = _render_text_stamp(cleaned_text, font_size, rgb, opacity, rotation)
    else:
        if image_file is None:
            raise InvalidOptionError("Upload a PNG or JPG watermark image.")
        if not (0.1 <= scale <= 0.9):
            raise InvalidOptionError("Image scale must be between 10% and 90%.")
        stamp_bytes, img_w, img_h = _render_image_stamp(image_file.path, opacity, rotation)
        aspect = img_h / max(1, img_w)

    output = directory / "output.pdf"
    try:
        doc = pymupdf.open(source.path)
        try:
            selected = set(parse_pages(pages, doc.page_count))
            for idx in range(doc.page_count):
                if idx not in selected:
                    continue
                page = doc[idx]
                rect = page.rect
                if mode == "text":
                    box_w = min(base_w, rect.width * 0.9)
                    box_h = base_h * (box_w / max(1.0, base_w))
                else:
                    box_w = rect.width * scale
                    box_h = box_w * aspect
                    if box_h > rect.height * 0.85:
                        box_h = rect.height * 0.85
                        box_w = box_h / max(0.01, aspect)

                for target_rect in _place_rect(rect, box_w, box_h, position):
                    page.insert_image(target_rect, stream=stamp_bytes, overlay=True)

            doc.save(output, garbage=3, deflate=True)
            page_count = int(doc.page_count)
        finally:
            doc.close()
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError("We couldn't add the watermark to that PDF.") from exc

    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name)}-watermarked.pdf",
        media_type="application/pdf",
        meta={
            "page_count": page_count,
            "watermarked_pages": len(selected),
            "mode": mode,
            "output_kind": "pdf",
        },
    )
