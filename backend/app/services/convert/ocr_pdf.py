"""Create a searchable PDF from scanned PDF pages using Tesseract OCR."""

from __future__ import annotations

import logging
import re
import subprocess
from pathlib import Path

import pymupdf

from app.config import get_settings
from app.errors import AppError, InvalidOptionError, ProcessingFailedError
from app.services.convert.commands import run_command
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name
from app.services.pdf.ranges import parse_pages
from app.services.pdf.render import page_pixmap

logger = logging.getLogger(__name__)
_LANG_CODE = re.compile(r"^[a-z]{3}(?:_[a-z]{3,4})?$")


def installed_ocr_languages() -> set[str]:
    try:
        proc = subprocess.run(
            ["tesseract", "--list-langs"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        lines = [line.strip() for line in (proc.stdout or "").splitlines()[1:]]
        return {line for line in lines if line and line != "osd"}
    except Exception:
        return set()


def ocr_pdf(
    source: SavedFile,
    directory: Path,
    *,
    language: str,
    dpi: int,
    pages: str,
    max_pixels: int,
) -> ProcessResult:
    lang = (language or "eng").strip().lower()
    if not _LANG_CODE.match(lang):
        raise InvalidOptionError("Choose a valid OCR language code.")
    if dpi not in {150, 200}:
        raise InvalidOptionError("Choose 150 or 200 DPI for OCR.")

    available = installed_ocr_languages()
    if not available:
        raise ProcessingFailedError("OCR engine (Tesseract) is not available on this server.")
    if lang not in available:
        raise InvalidOptionError(
            f"OCR language “{lang}” is not installed on this server. Available: {', '.join(sorted(available))}."
        )

    parts = directory / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    output = directory / "output.pdf"

    try:
        src_doc = pymupdf.open(source.path)
        out_doc = pymupdf.open()
        ocr_pages = 0
        try:
            selected = set(parse_pages(pages, src_doc.page_count))
            for idx in range(src_doc.page_count):
                if idx not in selected:
                    out_doc.insert_pdf(src_doc, from_page=idx, to_page=idx)
                    continue

                page = src_doc[idx]
                img_path = parts / f"page-{idx + 1:04d}.png"
                pdf_stem = parts / f"ocr-{idx + 1:04d}"
                pdf_path = parts / f"ocr-{idx + 1:04d}.pdf"

                pix, _ = page_pixmap(page, dpi=dpi, max_pixels=max_pixels)
                pix.save(str(img_path))

                settings = get_settings()
                res = run_command(
                    [
                        "tesseract",
                        str(img_path),
                        str(pdf_stem),
                        "-l",
                        lang,
                        "--dpi",
                        str(dpi),
                        "pdf",
                    ],
                    timeout=settings.conversion_timeout_seconds,
                    cwd=parts,
                )
                img_path.unlink(missing_ok=True)
                if res.returncode != 0 or not pdf_path.is_file():
                    raise ProcessingFailedError("OCR failed on one of the pages.")

                page_ocr = pymupdf.open(pdf_path)
                try:
                    out_doc.insert_pdf(page_ocr)
                finally:
                    page_ocr.close()
                pdf_path.unlink(missing_ok=True)
                ocr_pages += 1

            out_doc.save(output, garbage=3, deflate=True)
            total_pages = int(out_doc.page_count)
        finally:
            out_doc.close()
            src_doc.close()
    except AppError:
        raise
    except Exception as exc:
        logger.exception("ocr_pdf failed")
        raise ProcessingFailedError("We couldn't run OCR on that PDF.") from exc

    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name)}-ocr.pdf",
        media_type="application/pdf",
        meta={
            "page_count": total_pages,
            "ocr_pages": ocr_pages,
            "language": lang,
            "output_kind": "pdf",
        },
    )
