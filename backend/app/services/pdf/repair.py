"""Detect structural PDF issues and attempt recovery via PyMuPDF and Ghostscript."""

from __future__ import annotations

import logging
from pathlib import Path

import pymupdf

from app.config import get_settings
from app.errors import AppError, EncryptedPdfError, InvalidPdfError, TooManyPagesError
from app.services.convert.commands import run_command
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name

logger = logging.getLogger(__name__)


def repair_pdf(source: SavedFile, directory: Path, *, max_pages: int) -> ProcessResult:
    raw_bytes = source.path.read_bytes()
    if b"obj" not in raw_bytes or b"endobj" not in raw_bytes:
        raise InvalidPdfError(
            "This file does not contain recoverable PDF objects."
        )

    output = directory / "output.pdf"
    method = ""
    page_count = 0

    # Stage 1: PyMuPDF structural rewrite (rebuilds xref, cleans streams).
    structural_ok = False
    try:
        doc = pymupdf.open(source.path)
        try:
            if getattr(doc, "needs_pass", 0) or (doc.is_encrypted and doc.page_count < 1):
                raise EncryptedPdfError(
                    f"“{source.display_name}” is password-protected. Unlock it before repairing."
                )
            if doc.page_count > max_pages:
                raise TooManyPagesError(
                    f"“{source.display_name}” has {doc.page_count} pages. The limit is {max_pages} pages."
                )
            doc.save(output, garbage=4, clean=True, deflate=True)
            structural_ok = True
            method = "structural"
        finally:
            doc.close()
    except AppError:
        raise
    except Exception:
        logger.info("structural repair failed, trying Ghostscript")
        output.unlink(missing_ok=True)

    # Validate Stage 1 output; if invalid, fall back to Stage 2 (Ghostscript).
    if structural_ok:
        page_count = _validate_output(output, max_pages)
        if page_count < 1:
            structural_ok = False
            output.unlink(missing_ok=True)

    if not structural_ok:
        gs_out = directory / "gs-repaired.pdf"
        try:
            settings = get_settings()
            result = run_command(
                [
                    "gs",
                    "-q",
                    "-dNOPAUSE",
                    "-dBATCH",
                    "-dSAFER",
                    "-sDEVICE=pdfwrite",
                    f"-sOutputFile={gs_out}",
                    str(source.path),
                ],
                timeout=settings.conversion_timeout_seconds,
                cwd=directory,
            )
            if result.returncode == 0 and gs_out.is_file() and gs_out.stat().st_size > 0:
                page_count = _validate_output(gs_out, max_pages)
                if page_count >= 1:
                    gs_out.replace(output)
                    method = "ghostscript"
        except AppError:
            raise
        except Exception:
            logger.info("ghostscript repair failed")
        finally:
            gs_out.unlink(missing_ok=True)

    if not method or page_count < 1 or not output.is_file():
        raise InvalidPdfError(
            "This PDF is too damaged to recover automatically. Try re-exporting it from the original app."
        )

    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name)}-repaired.pdf",
        media_type="application/pdf",
        meta={
            "page_count": page_count,
            "repair_method": method,
            "output_kind": "pdf",
        },
    )


def _validate_output(path: Path, max_pages: int) -> int:
    if not path.is_file() or path.stat().st_size < 10:
        return 0
    try:
        doc = pymupdf.open(path)
        try:
            if doc.page_count < 1 or doc.page_count > max_pages:
                return 0
            _ = doc[0].rect
            return int(doc.page_count)
        finally:
            doc.close()
    except Exception:
        return 0
