"""HTTP routes for the PDF and document tools."""

from __future__ import annotations

import asyncio
import functools
import logging
import time
from typing import Any, Callable

from fastapi import APIRouter, File, Form, Request, UploadFile

from app.config import Settings
from app.errors import AppError, BusyError, EmptyUploadError, InvalidOptionError, ProcessingFailedError
from app.schemas import JobResponse
from app.services.convert.html_policy import normalize_public_url
from app.services.convert.html_to_pdf import html_file_to_pdf, html_url_to_pdf
from app.services.convert.ocr_pdf import ocr_pdf
from app.services.convert.pdf_to_excel import pdf_to_excel
from app.services.convert.pdf_to_pdfa import pdf_to_pdfa
from app.services.convert.pdf_to_pptx import pdf_to_pptx
from app.services.convert.pdf_to_word import pdf_to_word
from app.services.convert.libreoffice import convert_office_to_pdf
from app.services.jobs import Job, JobStore, ProcessResult, SavedFile
from app.services.pdf.compress import compress_pdfs
from app.services.pdf.edit import edit_pdf
from app.services.pdf.jpg_to_pdf import jpg_to_pdf
from app.services.pdf.merge import merge_pdfs
from app.services.pdf.page_numbers import add_page_numbers
from app.services.pdf.pdf_to_jpg import pdf_to_jpg
from app.services.pdf.preview import render_page_preview
from app.services.pdf.protect import protect_pdf
from app.services.pdf.ranges import parse_bool, parse_choice, parse_int
from app.services.pdf.repair import repair_pdf
from app.services.pdf.rotate import rotate_pdfs
from app.services.pdf.sign import sign_pdf
from app.services.pdf.split import split_pdf
from app.services.pdf.unlock import unlock_pdf
from app.services.pdf.watermark import add_watermark
from app.services.uploads import collect_files
from app.services.worker import run_tool

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
    {"slug": "edit-pdf", "method": "POST", "path": "/api/v1/tools/edit"},
    {"slug": "watermark-pdf", "method": "POST", "path": "/api/v1/tools/watermark"},
    {"slug": "page-numbers", "method": "POST", "path": "/api/v1/tools/page-numbers"},
    {"slug": "repair-pdf", "method": "POST", "path": "/api/v1/tools/repair"},
    {"slug": "ocr-pdf", "method": "POST", "path": "/api/v1/tools/ocr"},
    {"slug": "protect-pdf", "method": "POST", "path": "/api/v1/tools/protect"},
    {"slug": "unlock-pdf", "method": "POST", "path": "/api/v1/tools/unlock"},
    {"slug": "sign-pdf", "method": "POST", "path": "/api/v1/tools/sign"},
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


async def _run(
    request: Request,
    job: Job,
    fn: Callable[..., ProcessResult],
    kwargs: dict[str, Any],
) -> ProcessResult:
    """Wait for a free job slot, then run the tool in its own process."""
    settings: Settings = request.app.state.settings
    store: JobStore = request.app.state.store
    slots: asyncio.Semaphore = request.app.state.job_slots
    try:
        await asyncio.wait_for(slots.acquire(), timeout=settings.queue_timeout_seconds)
    except asyncio.TimeoutError:
        raise BusyError() from None
    loop = asyncio.get_running_loop()
    future = loop.run_in_executor(
        None,
        functools.partial(run_tool, fn, kwargs, timeout=settings.conversion_timeout_seconds),
    )

    def _release(done: asyncio.Future) -> None:
        # The slot is freed when the process is gone, even if the client already left.
        slots.release()
        if not done.cancelled():
            done.exception()

    future.add_done_callback(_release)
    try:
        return await asyncio.shield(future)
    except asyncio.CancelledError:
        # The client left. Remove the job folder once the process has stopped writing to it.
        future.add_done_callback(lambda _done: store.discard(job))
        raise


async def _finish(
    request: Request,
    job: Job,
    files: list[SavedFile],
    fn: Callable[..., ProcessResult],
    /,
    **kwargs: Any,
) -> JobResponse:
    """Run ``fn(**kwargs)`` for ``job`` and describe the download.

    The parameters before ``/`` are positional so a tool can take ``files=``.
    """
    store: JobStore = request.app.state.store
    settings: Settings = request.app.state.settings
    try:
        result = await _run(request, job, fn, kwargs)
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
    return await _finish(request, job, saved, merge_pdfs, files=saved, directory=job.directory)


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
        split_pdf,
        source=saved[0],
        directory=job.directory,
        mode=selected_mode,
        ranges=ranges,
        interval=selected_interval,
        separate=parse_bool(separate),
        max_pages=settings.max_pages,
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
        compress_pdfs,
        files=saved,
        directory=job.directory,
        quality=selected,
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
        rotate_pdfs,
        files=saved,
        directory=job.directory,
        angle=selected_angle,
        pages=pages or "all",
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
        pdf_to_jpg,
        source=saved[0],
        directory=job.directory,
        dpi=selected_dpi,
        pages=pages or "all",
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
        jpg_to_pdf,
        files=saved,
        directory=job.directory,
        page_size=selected_size,
        orientation=selected_orientation,
        margin=selected_margin,
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
    return await _finish(request, job, saved, pdf_to_word, source=saved[0], directory=job.directory)


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
    return await _finish(request, job, saved, convert_office_to_pdf, source=saved[0], directory=job.directory)


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
    return await _finish(request, job, saved, pdf_to_excel, source=saved[0], directory=job.directory)


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
    return await _finish(request, job, saved, convert_office_to_pdf, source=saved[0], directory=job.directory)


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
        pdf_to_pptx,
        source=saved[0],
        directory=job.directory,
        mode=selected,
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
    return await _finish(request, job, saved, convert_office_to_pdf, source=saved[0], directory=job.directory)


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
            html_url_to_pdf,
            url=target,
            directory=job.directory,
            page_size=selected_size,
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
        html_file_to_pdf,
        source=saved[0],
        directory=job.directory,
        page_size=selected_size,
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
        pdf_to_pdfa,
        source=saved[0],
        directory=job.directory,
        level=selected,
    )


@router.post("/tools/protect", response_model=JobResponse)
async def protect_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    user_password: str = Form(""),
    owner_password: str = Form(""),
    allow_print: str = Form("true"),
    allow_copy: str = Form("true"),
    allow_modify: str = Form("false"),
) -> JobResponse:
    uploads = as_uploads(files)
    _one(uploads, "Protect one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="protect",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to protect.",
    )
    return await _finish(
        request,
        job,
        saved,
        protect_pdf,
        source=saved[0],
        directory=job.directory,
        user_password=user_password,
        owner_password=owner_password,
        allow_print=parse_bool(allow_print),
        allow_copy=parse_bool(allow_copy),
        allow_modify=parse_bool(allow_modify),
    )


@router.post("/tools/unlock", response_model=JobResponse)
async def unlock_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    password: str = Form(""),
    authorized: str = Form("false"),
) -> JobResponse:
    settings: Settings = request.app.state.settings
    uploads = as_uploads(files)
    _one(uploads, "Unlock one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="unlock",
        kind="encrypted_pdf",
        min_files=1,
        min_message="Add a PDF to unlock.",
    )
    return await _finish(
        request,
        job,
        saved,
        unlock_pdf,
        source=saved[0],
        directory=job.directory,
        password=password,
        authorized=parse_bool(authorized),
        max_pages=settings.max_pages,
    )


@router.post("/tools/repair", response_model=JobResponse)
async def repair_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
) -> JobResponse:
    settings: Settings = request.app.state.settings
    uploads = as_uploads(files)
    _one(uploads, "Repair one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="repair",
        kind="raw_pdf",
        min_files=1,
        min_message="Add a PDF to repair.",
    )
    return await _finish(
        request,
        job,
        saved,
        repair_pdf,
        source=saved[0],
        directory=job.directory,
        max_pages=settings.max_pages,
    )


@router.post("/tools/page-numbers", response_model=JobResponse)
async def page_numbers_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    position: str = Form("bottom-center"),
    format: str = Form("number"),
    start_number: str = Form("1"),
    font: str = Form("helv"),
    font_size: str = Form("11"),
    color: str = Form("#334155"),
    pages: str = Form("all"),
) -> JobResponse:
    uploads = as_uploads(files)
    _one(uploads, "Add page numbers to one PDF at a time.")
    start_val = parse_int(start_number, label="Starting number", minimum=1, maximum=10000)
    size_val = parse_int(font_size, label="Font size", minimum=8, maximum=36)
    job, saved = await _accept(
        request,
        uploads,
        tool="page-numbers",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to number.",
    )
    return await _finish(
        request,
        job,
        saved,
        add_page_numbers,
        source=saved[0],
        directory=job.directory,
        position=position.strip().lower(),
        fmt=format.strip().lower(),
        start_number=start_val,
        font=font.strip().lower(),
        font_size=size_val,
        color=color,
        pages=pages,
    )


@router.post("/tools/watermark", response_model=JobResponse)
async def watermark_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    watermark_image: UploadFile | None = File(default=None),
    mode: str = Form("text"),
    text: str = Form(""),
    font_size: str = Form("48"),
    color: str = Form("#0C5F5A"),
    opacity: str = Form("0.25"),
    rotation: str = Form("-45"),
    position: str = Form("center"),
    pages: str = Form("all"),
    scale: str = Form("0.35"),
) -> JobResponse:
    settings: Settings = request.app.state.settings
    uploads = as_uploads(files)
    _one(uploads, "Watermark one PDF at a time.")
    selected_mode = parse_choice(mode, {"text", "image"}, "Choose a text or image watermark.")
    size_val = parse_int(font_size, label="Font size", minimum=12, maximum=120)
    rot_val = parse_int(rotation, label="Rotation", minimum=-90, maximum=90)
    try:
        opacity_val = float(opacity)
    except (TypeError, ValueError) as exc:
        raise InvalidOptionError("Opacity must be a number.") from exc
    try:
        scale_val = float(scale)
    except (TypeError, ValueError) as exc:
        raise InvalidOptionError("Scale must be a number.") from exc

    job, saved = await _accept(
        request,
        uploads,
        tool="watermark",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to watermark.",
    )

    extra_img: SavedFile | None = None
    all_files = list(saved)
    if selected_mode == "image":
        if watermark_image is None:
            request.app.state.store.discard(job)
            raise InvalidOptionError("Upload a PNG or JPG watermark image.")
        try:
            img_saved = await collect_files(
                [watermark_image],
                settings,
                job.directory / "wm",
                kind="overlay_image",
                min_files=1,
                min_message="Upload a PNG or JPG watermark image.",
            )
            extra_img = img_saved[0]
            all_files.extend(img_saved)
        except Exception:
            request.app.state.store.discard(job)
            raise

    return await _finish(
        request,
        job,
        all_files,
        add_watermark,
        source=saved[0],
        directory=job.directory,
        mode=selected_mode,
        text=text,
        font_size=size_val,
        color=color,
        opacity=opacity_val,
        rotation=rot_val,
        position=position.strip().lower(),
        pages=pages,
        scale=scale_val,
        image_file=extra_img,
    )


@router.post("/tools/ocr", response_model=JobResponse)
async def ocr_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    language: str = Form("eng"),
    dpi: str = Form("150"),
    pages: str = Form("all"),
) -> JobResponse:
    settings: Settings = request.app.state.settings
    uploads = as_uploads(files)
    _one(uploads, "Run OCR on one PDF at a time.")
    dpi_val = parse_int(dpi, label="Resolution", minimum=150, maximum=200)
    job, saved = await _accept(
        request,
        uploads,
        tool="ocr",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to run OCR.",
    )
    return await _finish(
        request,
        job,
        saved,
        ocr_pdf,
        source=saved[0],
        directory=job.directory,
        language=language,
        dpi=dpi_val,
        pages=pages,
        max_pixels=settings.max_image_pixels,
    )


@router.post("/tools/sign", response_model=JobResponse)
async def sign_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    signature_image: UploadFile | None = File(default=None),
    placements: str = Form("[]"),
) -> JobResponse:
    settings: Settings = request.app.state.settings
    uploads = as_uploads(files)
    _one(uploads, "Sign one PDF at a time.")
    if signature_image is None:
        raise InvalidOptionError("Draw or upload a signature image first.")
    job, saved = await _accept(
        request,
        uploads,
        tool="sign",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to sign.",
    )
    try:
        sig_saved = await collect_files(
            [signature_image],
            settings,
            job.directory / "sig",
            kind="overlay_image",
            min_files=1,
            min_message="Draw or upload a signature image first.",
        )
    except Exception:
        request.app.state.store.discard(job)
        raise

    return await _finish(
        request,
        job,
        [*saved, *sig_saved],
        sign_pdf,
        source=saved[0],
        signature_image=sig_saved[0],
        directory=job.directory,
        placements_json=placements,
    )


@router.post("/tools/edit", response_model=JobResponse)
async def edit_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    images: list[UploadFile] | None = File(default=None),
    operations: str = Form("[]"),
) -> JobResponse:
    settings: Settings = request.app.state.settings
    uploads = as_uploads(files)
    _one(uploads, "Edit one PDF at a time.")
    job, saved = await _accept(
        request,
        uploads,
        tool="edit",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to edit.",
    )
    img_uploads = as_uploads(images)
    img_saved: list[SavedFile] = []
    if img_uploads:
        try:
            img_saved = await collect_files(
                img_uploads,
                settings,
                job.directory / "edit_images",
                kind="overlay_image",
                min_files=1,
                min_message="Upload PNG or JPG images.",
            )
        except Exception:
            request.app.state.store.discard(job)
            raise

    return await _finish(
        request,
        job,
        [*saved, *img_saved],
        edit_pdf,
        source=saved[0],
        directory=job.directory,
        operations_json=operations,
        image_files=img_saved,
    )


@router.post("/tools/preview")
async def preview_tool(
    request: Request,
    files: list[UploadFile] | None = File(default=None),
    page: str = Form("1"),
    include_text: str = Form("false"),
) -> dict[str, Any]:
    settings: Settings = request.app.state.settings
    uploads = as_uploads(files)
    _one(uploads, "Preview one PDF at a time.")
    page_num = parse_int(page, label="Page", minimum=1, maximum=settings.max_pages)
    store: JobStore = request.app.state.store
    job, saved = await _accept(
        request,
        uploads,
        tool="preview",
        kind="pdf",
        min_files=1,
        min_message="Add a PDF to preview.",
    )
    try:
        return await asyncio.to_thread(
            render_page_preview,
            saved[0].path,
            page_number=page_num,
            max_pixels=settings.max_image_pixels,
            include_text=parse_bool(include_text),
        )
    finally:
        store.discard(job)
