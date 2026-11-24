"""Password-protect a PDF with AES-256 encryption and configurable permissions."""

from __future__ import annotations

from pathlib import Path

import pymupdf

from app.errors import AppError, EncryptedPdfError, InvalidOptionError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name


def protect_pdf(
    source: SavedFile,
    directory: Path,
    *,
    user_password: str,
    owner_password: str,
    allow_print: bool,
    allow_copy: bool,
    allow_modify: bool,
) -> ProcessResult:
    if not user_password or len(user_password) > 128:
        raise InvalidOptionError("Enter a password between 1 and 128 characters.")
    if len(owner_password) > 128:
        raise InvalidOptionError("The owner password must be 128 characters or fewer.")

    output = directory / "output.pdf"
    try:
        doc = pymupdf.open(source.path)
        try:
            if doc.is_encrypted or getattr(doc, "needs_pass", 0):
                raise EncryptedPdfError(
                    f"“{source.display_name}” is already password-protected."
                )

            perms = pymupdf.PDF_PERM_ACCESSIBILITY
            if allow_print:
                perms |= pymupdf.PDF_PERM_PRINT
            if allow_copy:
                perms |= pymupdf.PDF_PERM_COPY
            if allow_modify:
                perms |= pymupdf.PDF_PERM_MODIFY | pymupdf.PDF_PERM_ANNOTATE

            effective_owner = owner_password if owner_password else user_password
            doc.save(
                output,
                encryption=pymupdf.PDF_ENCRYPT_AES_256,
                user_pw=user_password,
                owner_pw=effective_owner,
                permissions=perms,
                garbage=3,
                deflate=True,
            )
            page_count = int(doc.page_count)
        finally:
            doc.close()

        # Verify encryption is actually enforced on the output file.
        check = pymupdf.open(output)
        try:
            if not check.is_encrypted or not getattr(check, "needs_pass", 0):
                raise ProcessingFailedError("Could not verify password protection on the output PDF.")
            if check.authenticate(user_password) == 0:
                raise ProcessingFailedError("Could not verify password authentication on the output PDF.")
        finally:
            check.close()
    except AppError:
        raise
    except Exception as exc:
        raise ProcessingFailedError("We couldn't protect that PDF. Please try again.") from exc

    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name)}-protected.pdf",
        media_type="application/pdf",
        meta={
            "page_count": page_count,
            "encryption": "AES-256",
            "output_kind": "pdf",
        },
    )
