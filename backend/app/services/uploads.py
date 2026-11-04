"""Upload streaming, type detection, and document validation."""

from __future__ import annotations

import asyncio
import re
from pathlib import Path

import pymupdf
from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.config import Settings
from app.errors import (
    EmptyUploadError,
    EncryptedPdfError,
    FileTooLargeError,
    InvalidImageError,
    InvalidPdfError,
    TooManyFilesError,
    TooManyPagesError,
    TotalTooLargeError,
    UnsupportedTypeError,
)
from app.services.convert.formats import prepare_html, prepare_office
from app.services.jobs import SavedFile

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
_OFFICE_KINDS = {
    "word": {"doc", "docx"},
    "excel": {"xls", "xlsx"},
    "powerpoint": {"ppt", "pptx"},
}


def safe_display_name(name: str | None, fallback: str) -> str:
    base = Path(name or "").name
    base = _CONTROL_CHARS.sub("", base)
    base = re.sub(r"\s+", " ", base).strip().strip(".")
    if not base or base in {".", ".."}:
        return fallback
    return base[:80]


def sniff(path: Path) -> str:
    with path.open("rb") as handle:
        head = handle.read(1024)
    stripped = head.lstrip(b"\xef\xbb\xbf\x00\t\r\n ")
    if head.startswith(b"%PDF") or stripped.startswith(b"%PDF"):
        return "pdf"
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    return "unknown"


async def write_limited(upload: UploadFile, dest: Path, max_bytes: int, label: str) -> int:
    size = 0
    limit_mb = max(1, max_bytes // (1024 * 1024))
    try:
        with dest.open("wb") as handle:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    raise FileTooLargeError(
                        f"“{label}” is larger than the {limit_mb} MB limit."
                    )
                handle.write(chunk)
    except Exception:
        dest.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()
    if size == 0:
        dest.unlink(missing_ok=True)
        raise EmptyUploadError(f"“{label}” is empty.")
    return size


def inspect_pdf(path: Path, max_pages: int, label: str) -> int:
    if sniff(path) != "pdf":
        raise UnsupportedTypeError(f"“{label}” is not a PDF.")
    try:
        document = pymupdf.open(path)
    except Exception as exc:
        raise InvalidPdfError(f"“{label}” isn't a valid PDF. Export it again and retry.") from exc
    try:
        needs_password = bool(getattr(document, "needs_pass", 0))
        if needs_password or (document.is_encrypted and document.page_count < 1):
            raise EncryptedPdfError(
                f"“{label}” is password-protected. Remove the password and try again."
            )
        if document.page_count < 1:
            raise InvalidPdfError(f"“{label}” has no pages.")
        if document.page_count > max_pages:
            raise TooManyPagesError(
                f"“{label}” has {document.page_count} pages. The limit is {max_pages} pages."
            )
        _ = document[0].rect
        return int(document.page_count)
    except (EncryptedPdfError, InvalidPdfError, TooManyPagesError):
        raise
    except Exception as exc:
        raise InvalidPdfError(f"“{label}” isn't a valid PDF. Export it again and retry.") from exc
    finally:
        document.close()


def inspect_image(path: Path, max_pixels: int, label: str) -> tuple[int, int]:
    kind = sniff(path)
    if kind != "jpeg":
        raise UnsupportedTypeError(f"“{label}” needs to be a JPG or JPEG image.")
    Image.MAX_IMAGE_PIXELS = max_pixels
    try:
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            image.load()
            width, height = image.size
    except Image.DecompressionBombError as exc:
        raise InvalidImageError(f"“{label}” is too large to process.") from exc
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImageError(f"“{label}” is damaged or isn't a supported image.") from exc
    if width < 1 or height < 1 or width * height > max_pixels:
        raise InvalidImageError(f"“{label}” is too large to process.")
    return width, height


async def collect_files(
    uploads: list[UploadFile],
    settings: Settings,
    directory: Path,
    *,
    kind: str,
    min_files: int,
    min_message: str,
) -> list[SavedFile]:
    if len(uploads) == 0:
        raise EmptyUploadError(min_message)
    if len(uploads) < min_files:
        raise EmptyUploadError(min_message)
    if len(uploads) > settings.max_files:
        raise TooManyFilesError(f"You can upload up to {settings.max_files} files at once.")

    saved: list[SavedFile] = []
    total = 0
    inputs = directory / "inputs"
    inputs.mkdir(parents=True, exist_ok=True)
    for index, upload in enumerate(uploads, start=1):
        label = safe_display_name(upload.filename, f"File {index}")
        target = inputs / f"input-{index:02d}"
        size = await write_limited(upload, target, settings.max_file_bytes, label)
        total += size
        if total > settings.max_total_bytes:
            raise TotalTooLargeError(
                f"Those files add up to more than {settings.max_total_size_mb} MB. Remove one and try again."
            )
        # Opening a document can take a while, so it runs off the event loop.
        if kind == "pdf":
            pages = await asyncio.to_thread(inspect_pdf, target, settings.max_pages, label)
            saved.append(SavedFile(target, label, size, pages))
        elif kind == "image":
            await asyncio.to_thread(inspect_image, target, settings.max_image_pixels, label)
            saved.append(SavedFile(target, label, size, None))
        elif kind in _OFFICE_KINDS:
            target = await asyncio.to_thread(prepare_office, target, label, _OFFICE_KINDS[kind])
            saved.append(SavedFile(target, label, size, None))
        elif kind == "html":
            target = await asyncio.to_thread(prepare_html, target, label)
            saved.append(SavedFile(target, label, size, None))
        else:
            raise UnsupportedTypeError()
    return saved
