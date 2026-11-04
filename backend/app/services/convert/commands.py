"""Run external converters with a timeout and without a shell."""

from __future__ import annotations

import logging
import os
import signal
import subprocess
import time
from pathlib import Path

from app.errors import ProcessingFailedError

logger = logging.getLogger(__name__)

_TOO_LONG = "The conversion took too long and was stopped."

# Set by the job worker. External programs must finish before the job's time runs out,
# because they run in their own process group and would outlive a killed worker.
_deadline: float | None = None


def set_deadline(at: float | None) -> None:
    global _deadline
    _deadline = at


def _remaining(timeout: int) -> float:
    if _deadline is None:
        return float(timeout)
    left = _deadline - time.monotonic()
    if left <= 0:
        raise ProcessingFailedError(_TOO_LONG)
    return min(float(timeout), left)


def run_command(
    argv: list[str],
    *,
    timeout: int,
    cwd: Path,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[bytes]:
    """Run ``argv`` in its own process group so a timeout can stop child processes."""
    limit = _remaining(timeout)
    process = subprocess.Popen(
        argv,
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
    )
    try:
        stdout, stderr = process.communicate(timeout=limit)
    except subprocess.TimeoutExpired:
        _kill_group(process)
        process.communicate()
        raise ProcessingFailedError(_TOO_LONG)
    result = subprocess.CompletedProcess(argv, process.returncode or 0, stdout, stderr)
    if stderr:
        logger.info("converter stderr bytes=%s", min(len(stderr), 400))
    return result


def _kill_group(process: subprocess.Popen[bytes]) -> None:
    if not hasattr(os, "killpg"):
        # Windows has no process groups here. Local development only.
        process.kill()
        return
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        return
    except PermissionError:
        process.kill()
