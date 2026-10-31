"""Place JPG images onto PDF pages."""

from pathlib import Path

import pymupdf
from PIL import Image, ImageOps

from app.errors import AppError, InvalidOptionError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile

_PAGE_SIZES = {
    "a4": (595.276, 841.890),
    "letter": (612.0, 792.0),
}
_MARGINS = {"none": 0.0, "small": 36.0, "medium": 72.0}


def jpg_to_pdf(
    files: list[SavedFile],
    directory: Path,
    *,
    page_size: str,
    orientation: str,
    margin: str,
) -> ProcessResult:
    if page_size not in {"fit", "a4", "letter"}:
        raise InvalidOptionError("Choose Fit, A4, or Letter.")
    if orientation not in {"portrait", "landscape"}:
        raise InvalidOptionError("Choose portrait or landscape.")
    if margin not in _MARGINS:
        raise InvalidOptionError("Choose a margin of none, small, or medium.")

    parts = directory / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    document = pymupdf.open()
    try:
        for position, item in enumerate(files, start=1):
            normalized = parts / f"image-{position:03d}.jpg"
            width, height = _normalize_image(item.path, normalized)
            _add_page(document, normalized, width, height, page_size, orientation, margin)
        destination = directory / "output.pdf"
        document.save(destination, garbage=4, deflate=True)
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError() from exc
    finally:
        document.close()
    return ProcessResult(
        path=destination,
        download_name="convarter-images.pdf",
        media_type="application/pdf",
        meta={
            "page_count": len(files),
            "file_count": len(files),
            "image_count": len(files),
            "page_size": page_size,
            "output_kind": "pdf",
        },
    )


def _normalize_image(source: Path, destination: Path) -> tuple[int, int]:
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image) or image
        if image.mode in {"RGBA", "LA"} or (image.mode == "P" and "transparency" in image.info):
            rgba = image.convert("RGBA")
            background = Image.new("RGB", rgba.size, (255, 255, 255))
            background.paste(rgba, mask=rgba.getchannel("A"))
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")
        width, height = image.size
        image.save(destination, format="JPEG", quality=92, optimize=True)
    return width, height


def _add_page(document, image_path: Path, width: int, height: int, page_size: str, orientation: str, margin: str) -> None:
    if page_size == "fit":
        scale = min(1.0, 1440 / max(width, height))
        page = document.new_page(width=width * scale, height=height * scale)
        page.insert_image(page.rect, filename=str(image_path))
        return

    page_width, page_height = _PAGE_SIZES[page_size]
    if orientation == "landscape":
        page_width, page_height = page_height, page_width
    margin_pt = _MARGINS[margin]
    if margin_pt * 2 >= min(page_width, page_height):
        raise InvalidOptionError("That margin doesn't fit the selected page.")
    page = document.new_page(width=page_width, height=page_height)
    box_width = page_width - (margin_pt * 2)
    box_height = page_height - (margin_pt * 2)
    scale = min(box_width / width, box_height / height)
    draw_width = width * scale
    draw_height = height * scale
    x0 = margin_pt + (box_width - draw_width) / 2
    y0 = margin_pt + (box_height - draw_height) / 2
    page.insert_image(
        pymupdf.Rect(x0, y0, x0 + draw_width, y0 + draw_height),
        filename=str(image_path),
    )
