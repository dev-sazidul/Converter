"""Split a PDF by ranges, into single pages, or on a fixed interval."""

from pathlib import Path

from pypdf import PdfReader, PdfWriter

from app.errors import AppError, EncryptedPdfError, InvalidOptionError, ProcessingFailedError
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import finalize_outputs
from app.services.pdf.ranges import (
    check_total,
    chunk_pages,
    flatten_groups,
    parse_range_groups,
    unique_groups,
    unique_pages,
)


def split_pdf(
    source: SavedFile,
    directory: Path,
    *,
    mode: str,
    ranges: str,
    interval: int,
    separate: bool,
    max_pages: int,
) -> ProcessResult:
    page_count = source.pages or 0
    if mode == "pages":
        groups = [[index] for index in range(page_count)]
    elif mode == "interval":
        groups = chunk_pages(page_count, interval)
    elif mode == "ranges":
        groups = parse_range_groups(ranges, page_count)
        if separate:
            groups = unique_groups(groups)
            check_total(groups, max_pages)
        else:
            groups = [unique_pages(flatten_groups(groups))]
    else:
        raise InvalidOptionError("Choose ranges, every page, or an interval.")

    parts = directory / "parts"
    parts.mkdir(parents=True, exist_ok=True)
    try:
        reader = PdfReader(str(source.path), strict=False)
        if reader.is_encrypted:
            raise EncryptedPdfError(
                f"“{source.display_name}” is password-protected. Remove the password and try again."
            )
        entries: list[tuple[str, Path]] = []
        for position, indexes in enumerate(groups, start=1):
            writer = PdfWriter()
            for index in indexes:
                writer.add_page(reader.pages[index])
            filename = _part_name(mode, position, indexes, separate)
            path = parts / f"part-{position:03d}.pdf"
            with path.open("wb") as handle:
                writer.write(handle)
            entries.append((filename, path))
        output, download_name, media_type = finalize_outputs(
            directory,
            entries,
            single_name="bestconvert-split.pdf",
            zip_name="bestconvert-split.zip",
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
            "page_count": page_count,
            "file_count": 1,
            "part_count": len(groups),
            "output_kind": "zip" if media_type == "application/zip" else "pdf",
        },
    )


def _part_name(mode: str, position: int, indexes: list[int], separate: bool) -> str:
    if mode == "pages":
        return f"page-{indexes[0] + 1:03d}.pdf"
    if mode == "ranges" and separate:
        start = indexes[0] + 1
        end = indexes[-1] + 1
        if start == end:
            return f"pages-{start}.pdf"
        return f"pages-{start}-{end}.pdf"
    if len(indexes) == 1:
        return f"part-{position:03d}-page-{indexes[0] + 1}.pdf"
    return f"part-{position:03d}-pages-{indexes[0] + 1}-{indexes[-1] + 1}.pdf"
