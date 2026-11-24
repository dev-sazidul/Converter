"""Combine PDFs in the order they were uploaded."""

from pathlib import Path

from pypdf import PdfReader, PdfWriter

from app.errors import AppError, EncryptedPdfError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile


def merge_pdfs(files: list[SavedFile], directory: Path) -> ProcessResult:
    if len(files) < 2:
        raise ProcessingFailedError("Add at least two PDF files to merge.")
    writer = PdfWriter()
    page_count = 0
    try:
        for item in files:
            reader = PdfReader(str(item.path), strict=False)
            if reader.is_encrypted:
                raise EncryptedPdfError(
                    f"“{item.display_name}” is password-protected. Remove the password and try again."
                )
            for page in reader.pages:
                writer.add_page(page)
                page_count += 1
        destination = directory / "output.pdf"
        with destination.open("wb") as handle:
            writer.write(handle)
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError() from exc
    return ProcessResult(
        path=destination,
        download_name="bestconvert-merged.pdf",
        media_type="application/pdf",
        meta={"page_count": page_count, "file_count": len(files), "output_kind": "pdf"},
    )
