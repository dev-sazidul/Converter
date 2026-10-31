"""Headless LibreOffice conversion to PDF."""

from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path

import pymupdf

from app.config import get_settings
from app.errors import ProcessingFailedError
from app.services.convert.commands import run_command
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name

logger = logging.getLogger(__name__)

_MACRO_LOCK = """<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item>
</oor:items>
"""


def libreoffice_binary() -> str | None:
    found = shutil.which("soffice") or shutil.which("libreoffice")
    if found:
        return found
    mac = Path("/Applications/LibreOffice.app/Contents/MacOS/soffice")
    if mac.is_file():
        return str(mac)
    return None


def convert_office_to_pdf(source: SavedFile, directory: Path) -> ProcessResult:
    timeout = get_settings().conversion_timeout_seconds
    output = _to_pdf(source.path, directory, timeout)
    pages = _page_count(output)
    return ProcessResult(
        path=output,
        download_name=f"{stem_name(source.display_name, 'document')}.pdf",
        media_type="application/pdf",
        meta={"output_kind": "pdf", "page_count": pages},
    )


def _to_pdf(source: Path, directory: Path, timeout: int) -> Path:
    binary = libreoffice_binary()
    if binary is None:
        raise ProcessingFailedError(
            "Word, Excel, and PowerPoint conversion needs LibreOffice, which is not installed on this server."
        )
    work = directory / "lo-work"
    profile = work / "profile"
    out_dir = work / "out"
    user_dir = profile / "user"
    user_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)
    (user_dir / "registrymodifications.xcu").write_text(_MACRO_LOCK, encoding="utf-8")
    env = {
        "HOME": str(work),
        "TMPDIR": str(work),
        "PATH": "/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin",
        "LANG": "C.UTF-8",
        "SAL_USE_VCLPLUGIN": "svp",
    }
    inherited = os.environ.get("PATH")
    if inherited:
        env["PATH"] = inherited
    result = run_command(
        [
            binary,
            "--headless",
            "--norestore",
            "--nolockcheck",
            "--nologo",
            "--nofirststartwizard",
            f"-env:UserInstallation={profile.resolve().as_uri()}",
            "--convert-to",
            "pdf",
            "--outdir",
            str(out_dir),
            str(source.resolve()),
        ],
        timeout=timeout,
        cwd=work,
        env=env,
    )
    produced = _find_pdf(out_dir, source.stem)
    if produced is None or result.returncode != 0:
        logger.warning(
            "libreoffice failed code=%s stderr=%s",
            result.returncode,
            result.stderr[-300:].decode("utf-8", errors="replace"),
        )
        shutil.rmtree(work, ignore_errors=True)
        raise ProcessingFailedError(
            "We couldn't convert that document. It may use a feature this converter doesn't support."
        )
    destination = directory / "output.pdf"
    produced.replace(destination)
    shutil.rmtree(work, ignore_errors=True)
    if not destination.is_file() or not destination.read_bytes()[:5].startswith(b"%PDF"):
        destination.unlink(missing_ok=True)
        raise ProcessingFailedError(
            "We couldn't convert that document. It may use a feature this converter doesn't support."
        )
    return destination


def _find_pdf(out_dir: Path, stem: str) -> Path | None:
    expected = out_dir / f"{stem}.pdf"
    if expected.is_file() and expected.stat().st_size > 0:
        return expected
    found = [path for path in out_dir.glob("*.pdf") if path.is_file() and path.stat().st_size > 0]
    if len(found) == 1:
        return found[0]
    return None


def _page_count(path: Path) -> int:
    document = pymupdf.open(path)
    try:
        count = int(document.page_count)
    finally:
        document.close()
    if count < 1:
        raise ProcessingFailedError(
            "We couldn't convert that document. It may use a feature this converter doesn't support."
        )
    return count
