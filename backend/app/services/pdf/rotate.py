"""Rotate selected pages clockwise."""

from pathlib import Path

from pypdf import PdfReader, PdfWriter

from app.errors import AppError, EncryptedPdfError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import finalize_outputs, stem_name
from app.services.pdf.ranges import parse_pages


def rotate_pdfs(files: list[SavedFile], directory: Path, *, angle: int, pages: str) -> ProcessResult:
    parts = directory / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    entries: list[tuple[str, Path]] = []
    total_pages = 0
    try:
        for position, item in enumerate(files, start=1):
            reader = PdfReader(str(item.path), strict=False)
            if reader.is_encrypted:
                raise EncryptedPdfError(
                    f"“{item.display_name}” is password-protected. Remove the password and try again."
                )
            selected = set(parse_pages(pages, len(reader.pages)))
            writer = PdfWriter()
            for index, page in enumerate(reader.pages):
                if index in selected:
                    page.rotate(angle)
                writer.add_page(page)
            total_pages += len(reader.pages)
            path = parts / f"part-{position:03d}.pdf"
            with path.open("wb") as handle:
                writer.write(handle)
            entries.append((f"{stem_name(item.display_name)}-rotated.pdf", path))
        output, download_name, media_type = finalize_outputs(
            directory,
            entries,
            single_name="convarter-rotated.pdf",
            zip_name="convarter-rotated.zip",
            single_type="application/pdf",
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
            "page_count": total_pages,
            "file_count": len(files),
            "angle": angle,
            "output_kind": "zip" if media_type == "application/zip" else "pdf",
        },
    )
