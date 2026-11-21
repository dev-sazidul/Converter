"""Converter converter service.

This API is internal. Only the Next.js app calls it, over the private Docker
network. Browsers never reach it, so it has no CORS policy. When
``CONVERTER_TOKEN`` is set, every request except the health check must send it
in the ``X-Converter-Token`` header.
"""

from __future__ import annotations

import asyncio
import hmac
import logging
import time
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routes import jobs, system, tools
from app.config import get_settings
from app.errors import AppError
from app.services.jobs import JobStore

logger = logging.getLogger("convarter")


def _configure_logging() -> None:
    if logging.getLogger().handlers:
        return
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


async def _cleanup_loop(store: JobStore, interval: int) -> None:
    while True:
        await asyncio.sleep(max(5, interval))
        removed = await asyncio.to_thread(store.cleanup_expired)
        if removed:
            logger.info("removed %s expired jobs", removed)


def create_app() -> FastAPI:
    _configure_logging()
    settings = get_settings()
    store = JobStore(settings.storage_dir, settings.job_ttl_seconds)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        store.prepare()
        app.state.store = store
        app.state.settings = settings
        task = asyncio.create_task(_cleanup_loop(store, settings.cleanup_interval_seconds))
        logger.info("api ready environment=%s", settings.environment)
        try:
            yield
        finally:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

    app = FastAPI(
        title="Converter API",
        version="1.0.0",
        summary="PDF tools for organizing, optimizing, and converting documents.",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    app.state.store = store
    app.state.settings = settings
    app.state.job_slots = asyncio.Semaphore(settings.max_concurrent_jobs)
    token = settings.converter_token.encode("utf-8")

    @app.middleware("http")
    async def security_and_log(request: Request, call_next):
        started = time.perf_counter()
        path = request.url.path
        logged_path = "/api/v1/jobs/:id/download" if "/jobs/" in path else path
        if token and path != "/api/health":
            sent = request.headers.get("x-converter-token", "").encode("utf-8")
            if not hmac.compare_digest(sent, token):
                logger.warning("rejected request without converter token path=%s", logged_path)
                return JSONResponse(
                    status_code=401,
                    content={"error": {"code": "unauthorized", "message": "This service is internal."}},
                )
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("request crashed method=%s path=%s", request.method, logged_path)
            raise
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cache-Control"] = "no-store"
        elapsed = (time.perf_counter() - started) * 1000
        logger.info(
            "%s %s %s %.1fms",
            request.method,
            logged_path,
            response.status_code,
            elapsed,
        )
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
        locations = [error.get("loc", ()) for error in exc.errors()]
        if any("files" in location for location in locations):
            code = "empty_upload"
            message = "Add a file before continuing."
        else:
            code = "invalid_option"
            message = "Some of the options are missing or invalid. Check the form and try again."
        return JSONResponse(status_code=422, content={"error": {"code": code, "message": message}})

    @app.exception_handler(HTTPException)
    async def http_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        if exc.status_code == 404:
            body = {"code": "not_found", "message": "That page or download doesn't exist."}
        elif exc.status_code == 413:
            body = {"code": "file_too_large", "message": "That upload is too large."}
        else:
            body = {"code": "processing_failed", "message": "The request couldn't be completed."}
        return JSONResponse(status_code=exc.status_code, content={"error": body})

    @app.exception_handler(Exception)
    async def unhandled_handler(_request: Request, _exc: Exception) -> JSONResponse:
        logger.exception("unhandled error")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "processing_failed",
                    "message": "Something went wrong while processing the file. Please try again.",
                }
            },
        )

    app.include_router(system.router)
    app.include_router(tools.router)
    app.include_router(jobs.router)
    return app


app = create_app()
