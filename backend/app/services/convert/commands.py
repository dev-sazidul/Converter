"""Run external converters with a timeout and without a shell."""

from __future__ import annotations

import logging
import os
import signal
import subprocess
from pathlib import Path

from app.errors import ProcessingFailedError

logger = logging.getLogger(__name__)


def run_command(
    argv: list[str],
    *,
    timeout: int,
    cwd: Path,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[bytes]:
    """Run ``argv`` in its own process group so a timeout can stop child processes."""
    process = subprocess.Popen(
        argv,
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
    )
    try:
        stdout, stderr = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        _kill_group(process.pid)
        process.communicate()
        raise ProcessingFailedError("The conversion took too long and was stopped.")
    result = subprocess.CompletedProcess(argv, process.returncode or 0, stdout, stderr)
    if stderr:
        logger.info("converter stderr bytes=%s", min(len(stderr), 400))
    return result


def _kill_group(pid: int) -> None:
    try:
        os.killpg(pid, signal.SIGKILL)
    except ProcessLookupError:
        return
    except PermissionError:
        os.kill(pid, signal.SIGKILL)
