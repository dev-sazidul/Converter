"""Convert a PDF to PDF/A with Ghostscript and check the result.

The check confirms the PDF/A identification marker, an output intent, the
original page count, and that Ghostscript can read the file. It is not a full
ISO certification with veraPDF. The result note says that.
"""

from __future__ import annotations

import glob
import re
import shutil
from pathlib import Path

import pymupdf

from app.config import get_settings
from app.errors import AppError, ProcessingFailedError
from app.services.convert.commands import run_command
from app.services.jobs import ProcessResult, SavedFile
from app.services.pdf.packaging import stem_name

_LEVELS = {"1b": "1", "2b": "2", "3b": "3"}
_FAILURE = "The PDF/A file did not pass validation, so it was not saved."


def pdf_to_pdfa(source: SavedFile, directory: Path, *, level: str) -> ProcessResult:
    part = _LEVELS.get(level)
    if part is None:
        raise ProcessingFailedError("Choose PDF/A-1b, PDF/A-2b, or PDF/A-3b.")
    binary = shutil.which("gs")
    if binary is None:
        raise ProcessingFailedError("PDF/A conversion needs Ghostscript, which is not installed on this server.")
    icc = _icc_profile()
    if icc is None:
        raise ProcessingFailedError("PDF/A conversion needs a Ghostscript sRGB color profile, which was not found.")
    work = directory / "pdfa-work"
    work.mkdir(parents=True, exist_ok=True)
    prefix = work / "PDFA_def.ps"
    destination = directory / "output.pdf"
    prefix.write_text(_prefix(icc), encoding="ascii")
    timeout = get_settings().conversion_timeout_seconds
    try:
        result = run_command(
            [
                binary,
                "-dSAFER",
                f"--permit-file-read={icc}",
                f"-dPDFA={part}",
                "-dBATCH",
                "-dNOPAUSE",
                "-dNOOUTERSAVE",
                "-sColorConversionStrategy=RGB",
                "-sProcessColorModel=DeviceRGB",
                "-sDEVICE=pdfwrite",
                "-dPDFACompatibilityPolicy=1",
                f"-sOutputFile={destination}",
                str(prefix),
                str(source.path.resolve()),
            ],
            timeout=timeout,
            cwd=work,
        )
        if result.returncode != 0 or not destination.is_file():
            raise ProcessingFailedError(_FAILURE)
        _validate(destination, level=level, pages=int(source.pages or 0), gs=binary, timeout=timeout)
    except AppError:
        destination.unlink(missing_ok=True)
        raise
    except Exception as exc:
        destination.unlink(missing_ok=True)
        raise ProcessingFailedError(_FAILURE) from exc
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return ProcessResult(
        path=destination,
        download_name=f"{stem_name(source.display_name, 'document')}-pdfa.pdf",
        media_type="application/pdf",
        meta={
            "output_kind": "pdf",
            "page_count": int(source.pages or 0),
            "pdfa_level": level,
            "pdfa_checked": "yes",
            "note": (
                f"Saved as PDF/A-{level}. Ghostscript checked the PDF/A marker, output intent, "
                "page count, and file structure. This is not a full ISO veraPDF certification."
            ),
        },
    )


def _validate(path: Path, *, level: str, pages: int, gs: str, timeout: int) -> None:
    document = pymupdf.open(path)
    try:
        if document.is_encrypted or document.page_count != pages or document.page_count < 1:
            raise ProcessingFailedError(_FAILURE)
        if not path.read_bytes()[:5].startswith(b"%PDF"):
            raise ProcessingFailedError(_FAILURE)
        xmp = document.get_xml_metadata() or ""
        part = _xmp(xmp, "part")
        conformance = _xmp(xmp, "conformance")
        if part != level[0] or (conformance or "").upper() != "B":
            raise ProcessingFailedError(_FAILURE)
        catalog = document.pdf_catalog()
        kind, value = document.xref_get_key(catalog, "OutputIntents")
        if kind == "null" or not value or value == "null":
            raise ProcessingFailedError(_FAILURE)
    finally:
        document.close()
    checked = run_command(
        [gs, "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=nullpage", "-f", str(path)],
        timeout=timeout,
        cwd=path.parent,
    )
    if checked.returncode != 0:
        raise ProcessingFailedError(_FAILURE)


def _xmp(xmp: str, tag: str) -> str | None:
    element = re.search(rf"pdfaid:{tag}[^>]*>\s*([^<]+)\s*<", xmp, re.IGNORECASE)
    if element:
        return element.group(1).strip()
    attribute = re.search(rf"pdfaid:{tag}\s*=\s*['\"]([^'\"]+)['\"]", xmp, re.IGNORECASE)
    if attribute:
        return attribute.group(1).strip()
    return None


def _icc_profile() -> Path | None:
    configured = get_settings().pdfa_icc_path.strip()
    if configured and "\n" not in configured and "\r" not in configured:
        candidate = Path(configured)
        if candidate.is_file():
            return candidate.resolve()
    binary = shutil.which("gs")
    if binary:
        prefix = Path(binary).resolve().parents[1]
        beside = [
            prefix / "share/ghostscript/iccprofiles/srgb.icc",
            prefix / "share/ghostscript/iccprofiles/default_rgb.icc",
        ]
        for candidate in beside:
            if candidate.is_file():
                return candidate.resolve()
    patterns = [
        "/usr/share/color/icc/ghostscript/srgb.icc",
        "/usr/share/ghostscript/*/iccprofiles/srgb.icc",
        "/usr/share/ghostscript/*/iccprofiles/default_rgb.icc",
        "/opt/homebrew/share/ghostscript/*/iccprofiles/srgb.icc",
        "/opt/homebrew/Cellar/ghostscript/*/share/ghostscript/iccprofiles/srgb.icc",
        "/usr/local/share/ghostscript/*/iccprofiles/srgb.icc",
        "/usr/local/Cellar/ghostscript/*/share/ghostscript/iccprofiles/srgb.icc",
    ]
    for pattern in patterns:
        matches = sorted(glob.glob(pattern))
        if matches:
            return Path(matches[-1]).resolve()
    return None


def _prefix(icc: Path) -> str:
    safe = str(icc).replace("\\", "/").replace("(", "\\(").replace(")", "\\)")
    return f"""%!
/ICCProfile ({safe}) def
[ /_objdef {{icc_PDFA}} /type /stream /OBJ pdfmark
[ {{icc_PDFA}} << /N 3 >> /PUT pdfmark
[ {{icc_PDFA}} ICCProfile (r) file /PUT pdfmark
[ /_objdef {{OutputIntent_PDFA}} /type /dict /OBJ pdfmark
[ {{OutputIntent_PDFA}} <<
  /Type /OutputIntent
  /S /GTS_PDFA1
  /DestOutputProfile {{icc_PDFA}}
  /OutputConditionIdentifier (sRGB IEC61966-2.1)
  /Info (sRGB IEC61966-2.1)
>> /PUT pdfmark
[ {{Catalog}} << /OutputIntents [ {{OutputIntent_PDFA}} ] >> /PUT pdfmark
"""
