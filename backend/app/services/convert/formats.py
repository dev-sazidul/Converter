"""Detect office and HTML uploads from their contents."""

from __future__ import annotations

import zipfile
from pathlib import Path

from app.errors import InvalidDocumentError, UnsupportedTypeError

_OFFICE_EXTENSIONS = {
    "docx": ".docx",
    "doc": ".doc",
    "xlsx": ".xlsx",
    "xls": ".xls",
    "pptx": ".pptx",
    "ppt": ".ppt",
    "html": ".html",
}

_OFFICE_MESSAGES = {
    frozenset({"doc", "docx"}): "needs to be a Word .doc or .docx file.",
    frozenset({"xls", "xlsx"}): "needs to be an Excel .xls or .xlsx file.",
    frozenset({"ppt", "pptx"}): "needs to be a PowerPoint .ppt or .pptx file.",
}


def prepare_office(path: Path, label: str, allowed: set[str]) -> Path:
    """Rename a validated office file so LibreOffice can see the right extension."""
    kind = _office_kind(path, label)
    if kind not in allowed:
        message = _OFFICE_MESSAGES.get(frozenset(allowed), "isn't a supported document.")
        raise UnsupportedTypeError(f"“{label}” {message}")
    return _with_extension(path, _OFFICE_EXTENSIONS[kind])


def prepare_html(path: Path, label: str) -> Path:
    if not looks_like_html(path):
        raise UnsupportedTypeError(f"“{label}” needs to be an HTML file.")
    return _with_extension(path, ".html")


def looks_like_html(path: Path) -> bool:
    with path.open("rb") as handle:
        head = handle.read(8192)
    if head.startswith((b"%PDF", b"PK\x03\x04", b"PK\x05\x06", b"\xff\xd8\xff", b"\x89PNG", b"\xd0\xcf\x11\xe0")):
        return False
    if b"\x00" in head:
        return False
    text = head.decode("utf-8", errors="replace").lower()
    return any(token in text for token in ("<html", "<body", "<div", "<p", "<!doctype", "<table", "<h1", "<head", "<span"))


def read_html_text(path: Path) -> str:
    raw = path.read_bytes()
    if b"\x00" in raw[:1024]:
        raise UnsupportedTypeError("That file needs to be an HTML file.")
    return raw.decode("utf-8", errors="replace")


def _office_kind(path: Path, label: str) -> str:
    with path.open("rb") as handle:
        head = handle.read(8)
    if head.startswith(b"%PDF"):
        return "pdf"
    if head.startswith((b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08")):
        return _zip_kind(path, label)
    if head.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return _ole_kind(path)
    return "unknown"


def _zip_kind(path: Path, label: str) -> str:
    try:
        with zipfile.ZipFile(path) as archive:
            names = archive.namelist()
    except zipfile.BadZipFile as exc:
        raise InvalidDocumentError(f"“{label}” is damaged. Export it again and retry.") from exc
    if len(names) > 4000:
        raise InvalidDocumentError(f"“{label}” has too many internal files to convert.")
    present = set(names)
    if "word/document.xml" in present:
        return "docx"
    if "xl/workbook.xml" in present:
        return "xlsx"
    if "ppt/presentation.xml" in present:
        return "pptx"
    return "zip"


def _ole_kind(path: Path) -> str:
    blob = path.read_bytes()
    if b"WordDocument" in blob:
        return "doc"
    if b"PowerPoint Document" in blob:
        return "ppt"
    if b"Workbook" in blob:
        return "xls"
    return "ole"


def _with_extension(path: Path, suffix: str) -> Path:
    destination = path.with_name(path.name + suffix)
    path.replace(destination)
    return destination
