"""Render PDF pages to JPEG images."""

from pathlib import Path

import pymupdf
from PIL import Image

from app.errors import AppError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import finalize_outputs
from app.services.pdf.ranges import parse_pages


def pdf_to_jpg(source: SavedFile, directory: Path, *, dpi: int, pages: str) -> ProcessResult:
    selected = parse_pages(pages, source.pages or 0)
    parts = directory / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    try:
        document = pymupdf.open(source.path)
        entries: list[tuple[str, Path]] = []
        try:
            for number, index in enumerate(selected, start=1):
                page = document[index]
                pixmap = page.get_pixmap(dpi=dpi, alpha=False, colorspace=pymupdf.csRGB)
                if pixmap.n != 3:
                    pixmap = pymupdf.Pixmap(pymupdf.csRGB, pixmap)
                image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                path = parts / f"page-{number:03d}.jpg"
                image.save(path, format="JPEG", quality=85, optimize=True)
                entries.append((f"page-{index + 1:03d}.jpg", path))
        finally:
            document.close()
        output, download_name, media_type = finalize_outputs(
            directory,
            entries,
            single_name="convarter-page.jpg",
            zip_name="convarter-pages.zip",
            single_type="image/jpeg",
        )
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError() from exc
    return ProcessResult(
        path=output,
        download_name=download_name,
        media_type=media_type,
        meta={
            "page_count": len(selected),
            "file_count": 1,
            "dpi": dpi,
            "output_kind": "zip" if media_type == "application/zip" else "jpeg",
        },
    )
