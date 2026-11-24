"""Remove password protection when the authorized user supplies the correct password."""

from __future__ import annotations

from pathlib import Path

import pymupdf

from app.errors import AppError, InvalidOptionError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name


def unlock_pdf(
    source: SavedFile,
    directory: Path,
    *,
    password: str,
    authorized: bool,
    max_pages: int,
) -> ProcessResult:
    if not authorized:
        raise InvalidOptionError("Confirm that you are authorized to remove the password from this PDF.")
    if not password or len(password) > 128:
        raise InvalidOptionError("Enter the PDF password.")

    output = directory / "output.pdf"
    try:
        doc = pymupdf.open(source.path)
        try:
            if not doc.is_encrypted and not getattr(doc, "needs_pass", 0):
                raise InvalidOptionError("This PDF is not password-protected.")
            if doc.authenticate(password) == 0:
                raise InvalidOptionError("The password is incorrect. Check it and try again.")
            if doc.page_count > max_pages:
                raise InvalidOptionError(
                    f"This PDF has {doc.page_count} pages. The limit is {max_pages} pages."
                )
            doc.save(
                output,
                encryption=pymupdf.PDF_ENCRYPT_NONE,
                garbage=3,
                deflate=True,
            )
        finally:
            doc.close()

        # Verify output opens without a password and has readable pages.
        verify = pymupdf.open(output)
        try:
            if verify.is_encrypted or getattr(verify, "needs_pass", 0):
                raise ProcessingFailedError("The output PDF is still encrypted.")
            if verify.page_count < 1:
                raise ProcessingFailedError("The unlocked PDF has no pages.")
            _ = verify[0].rect
            page_count = int(verify.page_count)
        finally:
            verify.close()
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError("We couldn't unlock that PDF. Check the password and try again.") from exc

    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name)}-unlocked.pdf",
        media_type="application/pdf",
        meta={
            "page_count": page_count,
            "output_kind": "pdf",
        },
    )
