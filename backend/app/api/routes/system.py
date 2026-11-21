"""Health and public configuration."""

import os

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.api.routes.tools import TOOL_CATALOG
from app.schemas import LimitsResponse, MetaResponse, ToolInfo

router = APIRouter(tags=["system"])


@router.get("/api/health")
def health(request: Request):
    root = request.app.state.store.root
    if not root.exists() or not os.access(root, os.W_OK):
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ok"}


@router.get("/api/v1/meta", response_model=MetaResponse)
def meta(request: Request) -> MetaResponse:
    settings = request.app.state.settings
    return MetaResponse(
        name="Converter",
        limits=LimitsResponse(
            max_file_size_mb=settings.max_file_size_mb,
            max_total_size_mb=settings.max_total_size_mb,
            max_files=settings.max_files,
            max_pages=settings.max_pages,
            job_ttl_seconds=settings.job_ttl_seconds,
        ),
        tools=[ToolInfo(**item) for item in TOOL_CATALOG],
    )
