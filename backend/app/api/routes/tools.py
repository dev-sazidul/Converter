"""HTTP routes for the PDF and document tools."""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import APIRouter, File, Form, Request, UploadFile

from app.config import Settings
from app.errors import AppError, EmptyUploadError, InvalidOptionError, ProcessingFailedError
from app.schemas import JobResponse
from app.services.convert.html_policy import normalize_public_url
from app.services.convert.html_to_pdf import html_file_to_pdf, html_url_to_pdf
from app.services.convert.pdf_to_excel import pdf_to_excel
from app.services.convert.pdf_to_pdfa import pdf_to_pdfa
from app.services.convert.pdf_to_pptx import pdf_to_pptx
from app.services.convert.pdf_to_word import pdf_to_word
from app.services.convert.libreoffice import convert_office_to_pdf
from app.services.jobs import Job, JobStore, ProcessResult, SavedFile
from app.services.pdf.compress import compress_pdfs
from app.services.pdf.jpg_to_pdf import jpg_to_pdf
from app.services.pdf.merge import merge_pdfs
from app.services.pdf.pdf_to_jpg import pdf_to_jpg
from app.services.pdf.ranges import parse_bool, parse_choice, parse_int
from app.services.pdf.rotate import rotate_pdfs
from app.services.pdf.split import split_pdf
from app.services.uploads import collect_files

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["tools"])

TOOL_CATALOG = [
    {"slug": "merge-pdf", "method": "POST", "path": "/api/v1/tools/merge"},
    {"slug": "split-pdf", "method": "POST", "path": "/api/v1/tools/split"},
    {"slug": "compress-pdf", "method": "POST", "path": "/api/v1/tools/compress"},
    {"slug": "rotate-pdf", "method": "POST", "path": "/api/v1/tools/rotate"},
    {"slug": "pdf-to-jpg", "method": "POST", "path": "/api/v1/tools/pdf-to-jpg"},
    {"slug": "jpg-to-pdf", "method": "POST", "path": "/api/v1/tools/jpg-to-pdf"},
    {"slug": "pdf-to-word", "method": "POST", "path": "/api/v1/tools/pdf-to-word"},
    {"slug": "word-to-pdf", "method": "POST", "path": "/api/v1/tools/word-to-pdf"},
    {"slug": "pdf-to-excel", "method": "POST", "path": "/api/v1/tools/pdf-to-excel"},
    {"slug": "excel-to-pdf", "method": "POST", "path": "/api/v1/tools/excel-to-pdf"},
    {"slug": "pdf-to-powerpoint", "method": "POST", "path": "/api/v1/tools/pdf-to-powerpoint"},
    {"slug": "powerpoint-to-pdf", "method": "POST", "path": "/api/v1/tools/powerpoint-to-pdf"},
    {"slug": "html-to-pdf", "method": "POST", "path": "/api/v1/tools/html-to-pdf"},
    {"slug": "pdf-to-pdfa", "method": "POST", "path": "/api/v1/tools/pdf-to-pdfa"},
]


def as_uploads(files: list[UploadFile] | UploadFile | None) -> list[UploadFile]:
    if files is None:
        return []
    if isinstance(files, list):
        return files
    return [files]


async def _accept(
    request: Request,
    uploads: list[UploadFile],
    *,
    tool: str,
    kind: str,
    min_files: int,
    min_message: str,
) -> tuple[Job, list[SavedFile]]:
    store: JobStore = request.app.state.store
    settings: Settings = request.app.state.settings
    job = store.create(tool)
    try:
        saved = await collect_files(
            uploads,
            settings,
            job.directory,
            kind=kind,
            min_files=min_files,
            min_message=min_message,
        )
    except Exception:
        store.discard(job)
        raise
    return job, saved


async def _finish(
    request: Request,
    job: Job,
    files: list[SavedFile],
    work,
) -> JobResponse:
    store: JobStore = request.app.state.store
    settings: Settings = request.app.state.settings
    try:
        result: ProcessResult = await asyncio.to_thread(work)
        result.meta["input_bytes"] = sum(item.size for item in files)
        result.meta["output_bytes"] = result.path.stat().st_size
        result.meta.setdefault("file_count", len(files))
        store.complete(job, result)
        store.delete_inputs(job)
    except AppError:
        store.discard(job)
        raise
    except Exception:
        logger.exception("tool failed tool=%s", job.tool)
        store.discard(job)
        raise ProcessingFailedError()
    remaining = max(0, int(settings.job_ttl_seconds - (time.time() - job.created_at)))
    logger.info(
        "processed tool=%s bytes_in=%s bytes_out=%s",
        job.tool,
        result.meta.get("input_bytes"),
        result.meta.get("output_bytes"),
    )
    return JobResponse(
        job_id=job.id,
        filename=job.download_name or "download",
        media_type=job.media_type or "application/octet-stream",
        size_bytes=int(result.meta["output_bytes"]),
        download_url=f"/api/v1/jobs/{job.id}/download",
        expires_in_seconds=remaining,
        meta=result.meta,
    )


@router.post("/tools/merge", response_model=JobResponse)
async def merge_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
) -> JobResponse:
    job, saved = await _accept(
        request,
        as_uploads(files),
        tool="merge",
        kind="pdf",
        min_files=2,
        min_message="Add at least two PDF files to merge.",
    )
    return await _finish(request, job, saved, lambda: merge_pdfs(saved, job.directory))


@router.post("/tools/split", response_model=JobResponse)
async def split_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    mode: str = Form("ranges"),
    ranges: str = Form(""),
    interval: str = Form("1"),
    separate: str = Form("false"),
) -> JobResponse:
    settings: Settings = request.app.state.settings
    selected_mode = parse_choice(
        mode,
        {"ranges", "pages", "interval"},
        "Choose ranges, every page, or an interval.",
    )
    selected_interval = 1
    if selected_mode == "interval":
        selected_interval = parse_int(
            interval,
            label="Interval",
            minimum=1,
            maximum=settings.max_pages,
        )
    uploads = as_uploads(files)
    if len(uploads) > 1:
        raise EmptyUploadError("Split one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="split",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to split.",
    )
    return await _finish(
        request,
        job,
        saved,
        lambda: split_pdf(
            saved[0],
            job.directory,
            mode=selected_mode,
            ranges=ranges,
            interval=selected_interval,
            separate=parse_bool(separate),
        ),
    )


@router.post("/tools/compress", response_model=JobResponse)
async def compress_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    quality: str = Form("medium"),
) -> JobResponse:
    selected = parse_choice(
        quality,
        {"high", "medium", "low"},
        "Choose high, medium, or low quality.",
    )
    job, saved = await _accept(
        request,
        as_uploads(files),
        tool="compress",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to compress.",
    )
    return await _finish(
        request,
        job,
        saved,
        lambda: compress_pdfs(saved, job.directory, quality=selected),
    )


@router.post("/tools/rotate", response_model=JobResponse)
async def rotate_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    angle: str = Form("90"),
    pages: str = Form("all"),
) -> JobResponse:
    selected_angle = parse_int(angle, label="Rotation", minimum=90, maximum=270)
    if selected_angle not in {90, 180, 270}:
        raise InvalidOptionError("Rotation must be 90, 180, or 270 degrees.")
    job, saved = await _accept(
        request,
        as_uploads(files),
        tool="rotate",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to rotate.",
    )
    return await _finish(
        request,
        job,
        saved,
        lambda: rotate_pdfs(saved, job.directory, angle=selected_angle, pages=pages or "all"),
    )


@router.post("/tools/pdf-to-jpg", response_model=JobResponse)
async def pdf_to_jpg_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    dpi: str = Form("150"),
    pages: str = Form("all"),
) -> JobResponse:
    settings: Settings = request.app.state.settings
    selected_dpi = parse_int(dpi, label="Resolution", minimum=72, maximum=300)
    if selected_dpi not in settings.dpi_values:
        raise InvalidOptionError("Choose a resolution of 96, 150, or 200 DPI.")
    uploads = as_uploads(files)
    if len(uploads) > 1:
        raise EmptyUploadError("Convert one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="pdf-to-jpg",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to convert.",
    )
    return await _finish(
        request,
        job,
        saved,
        lambda: pdf_to_jpg(saved[0], job.directory, dpi=selected_dpi, pages=pages or "all"),
    )


@router.post("/tools/jpg-to-pdf", response_model=JobResponse)
async def jpg_to_pdf_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    page_size: str = Form("fit"),
    orientation: str = Form("portrait"),
    margin: str = Form("small"),
) -> JobResponse:
    selected_size = parse_choice(page_size, {"fit", "a4", "letter"}, "Choose Fit, A4, or Letter.")
    selected_orientation = parse_choice(
        orientation,
        {"portrait", "landscape"},
        "Choose portrait or landscape.",
    )
    selected_margin = parse_choice(
        margin,
        {"none", "small", "medium"},
        "Choose a margin of none, small, or medium.",
    )
    job, saved = await _accept(
        request,
        as_uploads(files),
        tool="jpg-to-pdf",
        kind="image",
        min_files=1,
        min_message="Add at least one JPG or JPEG image.",
    )
    return await _finish(
        request,
        job,
        saved,
        lambda: jpg_to_pdf(
            saved,
            job.directory,
            page_size=selected_size,
            orientation=selected_orientation,
            margin=selected_margin,
        ),
    )


def _one(uploads: list[UploadFile], message: str) -> None:
    if len(uploads) > 1:
        raise EmptyUploadError(message)


@router.post("/tools/pdf-to-word", response_model=JobResponse)
async def pdf_to_word_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
) -> JobResponse:
    uploads = as_uploads(files)
    _one(uploads, "Convert one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="pdf-to-word",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to convert.",
    )
    return await _finish(request, job, saved, lambda: pdf_to_word(saved[0], job.directory))


@router.post("/tools/word-to-pdf", response_model=JobResponse)
async def word_to_pdf_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
) -> JobResponse:
    uploads = as_uploads(files)
    _one(uploads, "Convert one Word file at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="word-to-pdf",
        kind="word",
        min_files=1,
        min_message="Add a Word file to convert.",
    )
    return await _finish(request, job, saved, lambda: convert_office_to_pdf(saved[0], job.directory))


@router.post("/tools/pdf-to-excel", response_model=JobResponse)
async def pdf_to_excel_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
) -> JobResponse:
    uploads = as_uploads(files)
    _one(uploads, "Convert one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="pdf-to-excel",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to convert.",
    )
    return await _finish(request, job, saved, lambda: pdf_to_excel(saved[0], job.directory))


@router.post("/tools/excel-to-pdf", response_model=JobResponse)
async def excel_to_pdf_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
) -> JobResponse:
    uploads = as_uploads(files)
    _one(uploads, "Convert one Excel file at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="excel-to-pdf",
        kind="excel",
        min_files=1,
        min_message="Add an Excel file to convert.",
    )
    return await _finish(request, job, saved, lambda: convert_office_to_pdf(saved[0], job.directory))


@router.post("/tools/pdf-to-powerpoint", response_model=JobResponse)
async def pdf_to_powerpoint_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    mode: str = Form("editable"),
) -> JobResponse:
    selected = parse_choice(
        mode,
        {"editable", "image"},
        "Choose editable text or a picture of each page.",
    )
    uploads = as_uploads(files)
    _one(uploads, "Convert one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="pdf-to-powerpoint",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to convert.",
    )
    return await _finish(
        request,
        job,
        saved,
        lambda: pdf_to_pptx(saved[0], job.directory, mode=selected),
    )


@router.post("/tools/powerpoint-to-pdf", response_model=JobResponse)
async def powerpoint_to_pdf_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
) -> JobResponse:
    uploads = as_uploads(files)
    _one(uploads, "Convert one PowerPoint file at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="powerpoint-to-pdf",
        kind="powerpoint",
        min_files=1,
        min_message="Add a PowerPoint file to convert.",
    )
    return await _finish(request, job, saved, lambda: convert_office_to_pdf(saved[0], job.directory))


@router.post("/tools/html-to-pdf", response_model=JobResponse)
async def html_to_pdf_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    source: str = Form("file"),
    url: str = Form(""),
    page_size: str = Form("a4"),
) -> JobResponse:
    selected_source = parse_choice(source, {"file", "url"}, "Choose an HTML file or a web address.")
    selected_size = parse_choice(page_size, {"a4", "letter"}, "Choose A4 or Letter.")
    uploads = as_uploads(files)
    if selected_source == "url":
        if uploads:
            raise InvalidOptionError("Remove the file, or switch to an HTML file.")
        target = normalize_public_url(url)
        store: JobStore = request.app.state.store
        job = store.create("html-to-pdf")
        return await _finish(
            request,
            job,
            [],
            lambda: html_url_to_pdf(target, job.directory, page_size=selected_size),
        )
    _one(uploads, "Convert one HTML file at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="html-to-pdf",
        kind="html",
        min_files=1,
        min_message="Add an HTML file to convert.",
    )
    return await _finish(
        request,
        job,
        saved,
        lambda: html_file_to_pdf(saved[0], job.directory, page_size=selected_size),
    )


@router.post("/tools/pdf-to-pdfa", response_model=JobResponse)
async def pdf_to_pdfa_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    level: str = Form("2b"),
) -> JobResponse:
    selected = parse_choice(level, {"1b", "2b", "3b"}, "Choose PDF/A-1b, PDF/A-2b, or PDF/A-3b.")
    uploads = as_uploads(files)
    _one(uploads, "Convert one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="pdf-to-pdfa",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to convert.",
    )
    return await _finish(
        request,
        job,
        saved,
        lambda: pdf_to_pdfa(saved[0], job.directory, level=selected),
    )
