"""Render HTML or a public web page to PDF with Chromium.

Uploaded documents are rendered from memory with JavaScript and network
access turned off. Web pages may load public resources, and every request
is checked again so a redirect cannot reach a private address or a local file.
"""

from __future__ import annotations

import logging
from pathlib import Path

import pymupdf

from app.config import get_settings
from app.errors import AppError, ProcessingFailedError
from app.services.convert.formats import read_html_text
from app.services.convert.html_policy import normalize_public_url, sanitize_uploaded_html
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name

logger = logging.getLogger(__name__)

_CHROMIUM_ARGS = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--no-first-run",
    "--disable-sync",
]


def html_file_to_pdf(source: SavedFile, directory: Path, *, page_size: str) -> ProcessResult:
    html = sanitize_uploaded_html(read_html_text(source.path))
    output = _render(directory, page_size=page_size, html=html, url=None)
    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name, 'page')}.pdf",
        media_type="application/pdf",
        meta={"output_kind": "pdf", "page_count": _pages(output), "source": "file"},
    )


def html_url_to_pdf(url: str, directory: Path, *, page_size: str) -> ProcessResult:
    target = normalize_public_url(url)
    output = _render(directory, page_size=page_size, html=None, url=target)
    return ProcessResult(
        path=output,
        download_name="page.pdf",
        media_type="application/pdf",
        meta={"output_kind": "pdf", "page_count": _pages(output), "source": "url"},
    )


def _render(directory: Path, *, page_size: str, html: str | None, url: str | None) -> Path:
    settings = get_settings()
    timeout_ms = max(1000, settings.html_navigation_timeout_seconds * 1000)
    destination = directory / "output.pdf"
    try:
        from playwright.sync_api import TimeoutError as PlaywrightTimeout
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise ProcessingFailedError(
            "HTML to PDF needs Chromium, which is not installed on this server."
        ) from exc
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=_CHROMIUM_ARGS)
            try:
                context = browser.new_context(
                    java_script_enabled=url is not None,
                    accept_downloads=False,
                    ignore_https_errors=False,
                )
                page = context.new_page()
                page.set_default_timeout(timeout_ms)
                page.route("**/*", lambda route: _route(route, allow_network=url is not None))
                if html is not None:
                    page.set_content(html, wait_until="domcontentloaded", timeout=timeout_ms)
                else:
                    page.goto(url or "", wait_until="load", timeout=timeout_ms)
                page.pdf(
                    path=str(destination),
                    format="A4" if page_size == "a4" else "Letter",
                    print_background=True,
                )
            finally:
                browser.close()
    except AppError:
        raise
    except PlaywrightTimeout as exc:
        raise ProcessingFailedError("The page took too long to render and was stopped.") from exc
    except Exception as exc:
        logger.exception("html to pdf failed")
        message = str(exc)
        if "Executable doesn't exist" in message or "BrowserType.launch" in message:
            raise ProcessingFailedError(
                "HTML to PDF needs Chromium, which is not installed on this server."
            ) from exc
        raise ProcessingFailedError(
            "We couldn't render that page. Check the HTML or try a different address."
        ) from exc
    if not destination.is_file() or not destination.read_bytes()[:5].startswith(b"%PDF"):
        raise ProcessingFailedError("We couldn't render that page. Check the HTML or try a different address.")
    return destination


def _route(route, *, allow_network: bool) -> None:
    target = route.request.url
    if target.startswith(("about:", "data:", "blob:")):
        if allow_network or target.startswith(("about:", "data:")):
            route.continue_()
            return
        route.abort()
        return
    if not allow_network or target.startswith("file:"):
        route.abort()
        return
    try:
        normalize_public_url(target)
    except AppError:
        route.abort()
        return
    route.continue_()


def _pages(path: Path) -> int:
    document = pymupdf.open(path)
    try:
        return int(document.page_count)
    finally:
        document.close()
