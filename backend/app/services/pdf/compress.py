"""Reduce PDF size with structural cleanup and image recompression."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

import pymupdf
from PIL import Image

from app.errors import AppError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import finalize_outputs, stem_name
from app.services.pdf.render import page_pixmap

logger = logging.getLogger(__name__)

_PROFILES = {
    "high": {"rewrite": False, "raster": False, "quality": 85, "dpi": 150},
    "medium": {"rewrite": True, "raster": False, "quality": 55, "dpi": 120},
    "low": {"rewrite": True, "raster": True, "quality": 32, "dpi": 96},
}


def compress_pdfs(files: list[SavedFile], directory: Path, *, quality: str) -> ProcessResult:
    profile = _PROFILES[quality]
    parts = directory / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    entries: list[tuple[str, Path]] = []
    input_bytes = 0
    compressed_bytes = 0
    page_count = 0
    try:
        for position, item in enumerate(files, start=1):
            destination = parts / f"part-{position:03d}.pdf"
            _compress_one(item.path, destination, profile)
            entries.append((f"{stem_name(item.display_name)}-compressed.pdf", destination))
            input_bytes += item.size
            compressed_bytes += destination.stat().st_size
            page_count += item.pages or 0
        output, download_name, media_type = finalize_outputs(
            directory,
            entries,
            single_name="bestconvert-compressed.pdf",
            zip_name="bestconvert-compressed.zip",
            single_type="application/pdf",
        )
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError() from exc

    saved = max(0, input_bytes - compressed_bytes)
    percent = round((saved / input_bytes) * 100) if input_bytes else 0
    return ProcessResult(
        path=output,
        download_name=download_name,
        media_type=media_type,
        meta={
            "page_count": page_count,
            "file_count": len(files),
            "saved_bytes": saved,
            "saved_percent": percent,
            "output_kind": "zip" if media_type == "application/zip" else "pdf",
        },
    )


def _compress_one(source: Path, destination: Path, profile: dict) -> None:
    candidates: list[Path] = []
    structural = destination.with_name(destination.stem + "-structural.pdf")
    if _structural(source, structural):
        candidates.append(structural)
    if profile["rewrite"]:
        rewritten = destination.with_name(destination.stem + "-images.pdf")
        if _recompress_images(source, rewritten, profile["quality"], profile["dpi"]):
            candidates.append(rewritten)
    if profile["raster"] and _has_images(source):
        raster = destination.with_name(destination.stem + "-raster.pdf")
        if _rasterize(source, raster, profile["dpi"], profile["quality"]):
            candidates.append(raster)

    original_size = source.stat().st_size
    page_count = _page_count(source)
    valid = [
        path
        for path in candidates
        if path.is_file() and path.stat().st_size > 0 and _usable(path, page_count)
    ]
    if not valid:
        raise ProcessingFailedError()
    best = min(valid, key=lambda path: path.stat().st_size)
    if best.stat().st_size >= original_size:
        shutil.copyfile(source, destination)
    else:
        shutil.copyfile(best, destination)
    for path in valid:
        if path.resolve() != destination.resolve():
            path.unlink(missing_ok=True)


def _structural(source: Path, destination: Path) -> bool:
    try:
        document = pymupdf.open(source)
        try:
            document.save(
                destination,
                garbage=4,
                deflate=True,
                clean=True,
                deflate_images=True,
                deflate_fonts=True,
            )
        finally:
            document.close()
        return destination.is_file()
    except Exception:
        logger.info("structural compression was skipped")
        destination.unlink(missing_ok=True)
        return False


def _recompress_images(source: Path, destination: Path, quality: int, dpi_target: int) -> bool:
    try:
        document = pymupdf.open(source)
        try:
            if hasattr(document, "rewrite_images"):
                try:
                    document.rewrite_images(
                        dpi_threshold=dpi_target,
                        dpi_target=dpi_target,
                        quality=quality,
                    )
                except TypeError:
                    document.rewrite_images(quality=quality)
            else:
                _replace_image_streams(document, quality)
            document.save(destination, garbage=4, deflate=True, clean=True)
        finally:
            document.close()
        return destination.is_file()
    except Exception:
        logger.info("image recompression was skipped")
        destination.unlink(missing_ok=True)
        return False


def _replace_image_streams(document, quality: int) -> None:
    seen: set[int] = set()
    for index in range(document.page_count):
        page = document[index]
        for image in page.get_images(full=True):
            xref = image[0]
            if xref in seen:
                continue
            seen.add(xref)
            pixmap = pymupdf.Pixmap(document, xref)
            if pixmap.n != 3 or pixmap.alpha:
                pixmap = pymupdf.Pixmap(pymupdf.csRGB, pixmap)
            payload = _jpeg_bytes(pixmap, quality)
            if hasattr(page, "replace_image"):
                page.replace_image(xref, stream=payload)


def _rasterize(source: Path, destination: Path, dpi: int, quality: int) -> bool:
    try:
        source_doc = pymupdf.open(source)
        output = pymupdf.open()
        try:
            for page in source_doc:
                pixmap, _reduced = page_pixmap(page, dpi)
                payload = _jpeg_bytes(pixmap, quality)
                new_page = output.new_page(width=page.rect.width, height=page.rect.height)
                new_page.insert_image(new_page.rect, stream=payload)
            output.save(destination, garbage=4, deflate=True)
        finally:
            source_doc.close()
            output.close()
        return destination.is_file()
    except Exception:
        logger.info("raster compression was skipped")
        destination.unlink(missing_ok=True)
        return False


def _page_count(source: Path) -> int:
    document = pymupdf.open(source)
    try:
        return int(document.page_count)
    finally:
        document.close()


def _usable(path: Path, page_count: int) -> bool:
    try:
        document = pymupdf.open(path)
    except Exception:
        return False
    try:
        return document.page_count == page_count and document[0].rect.width > 0
    except Exception:
        return False
    finally:
        document.close()


def _has_images(source: Path) -> bool:
    document = pymupdf.open(source)
    try:
        for page in document:
            if page.get_images():
                return True
        return False
    finally:
        document.close()


def _jpeg_bytes(pixmap, quality: int) -> bytes:
    if pixmap.n != 3 or pixmap.alpha:
        pixmap = pymupdf.Pixmap(pymupdf.csRGB, pixmap)
    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    from io import BytesIO

    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=quality, optimize=True)
    return buffer.getvalue()
