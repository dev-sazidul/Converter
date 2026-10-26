"""Shared file packaging helpers."""

from __future__ import annotations

import re
import zipfile
from pathlib import Path

_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def arc_name(name: str, fallback: str) -> str:
    cleaned = _SAFE.sub("-", Path(name).name).strip(".-")
    return (cleaned or fallback)[:80]


def stem_name(name: str, fallback: str = "document") -> str:
    stem = Path(name).stem
    cleaned = _SAFE.sub("-", stem).strip("-.")
    return (cleaned or fallback)[:40]


def write_zip(destination: Path, entries: list[tuple[str, Path]]) -> None:
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, path in entries:
            archive.write(path, arcname=arc_name(name, "file"))


def finalize_outputs(
    directory: Path,
    entries: list[tuple[str, Path]],
    *,
    single_name: str,
    zip_name: str,
    single_type: str,
) -> tuple[Path, str, str]:
    """Return one file directly, or a zip when there are several outputs."""
    if len(entries) == 1:
        source = entries[0][1]
        suffix = Path(single_name).suffix or source.suffix
        target = directory / f"output{suffix}"
        if source.resolve() != target.resolve():
            source.replace(target)
        return target, single_name, single_type
    target = directory / "output.zip"
    write_zip(target, entries)
    return target, zip_name, "application/zip"
