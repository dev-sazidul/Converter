"""Run each tool in a child process with a hard time limit.

A thread can't be stopped, so a PDF that makes PyMuPDF or pypdf work for
hours would keep a thread busy for hours. Each job runs in its own process
instead. The process is killed when ``CONVERSION_TIMEOUT_SECONDS`` runs out,
and a crash in a native library ends only that job, not the API.

On Linux the children are forked from a small server process that has the PDF
libraries loaded already, so starting a job is fast. Windows uses spawn.
"""

from __future__ import annotations

import logging
import multiprocessing
import os
import signal
import threading
import time
from typing import Any, Callable

from app.errors import AppError, ProcessingFailedError
from app.services.jobs import ProcessResult

logger = logging.getLogger(__name__)

# Time for a child to report an external converter's own timeout before it is killed.
GRACE_SECONDS = 5

_PRELOAD = [
    "app.services.convert.html_to_pdf",
    "app.services.convert.libreoffice",
    "app.services.convert.pdf_to_excel",
    "app.services.convert.pdf_to_pdfa",
    "app.services.convert.pdf_to_pptx",
    "app.services.convert.pdf_to_word",
    "app.services.pdf.compress",
    "app.services.pdf.jpg_to_pdf",
    "app.services.pdf.merge",
    "app.services.pdf.pdf_to_jpg",
    "app.services.pdf.rotate",
    "app.services.pdf.split",
]

_context_lock = threading.Lock()
_context: multiprocessing.context.BaseContext | None = None


def _get_context() -> multiprocessing.context.BaseContext:
    global _context
    with _context_lock:
        if _context is None:
            if "forkserver" in multiprocessing.get_all_start_methods():
                context = multiprocessing.get_context("forkserver")
                context.set_forkserver_preload(_PRELOAD)
            else:
                context = multiprocessing.get_context("spawn")
            _context = context
        return _context


def run_tool(fn: Callable[..., ProcessResult], kwargs: dict[str, Any], *, timeout: float) -> ProcessResult:
    """Call ``fn(**kwargs)`` in a child process and return its result.

    ``fn`` must be a module-level function, and ``kwargs`` must be picklable.
    Errors meant for the person (``AppError``) are raised again here. Anything
    else is logged by the child and becomes a generic ``ProcessingFailedError``.
    """
    context = _get_context()
    receiver, sender = context.Pipe(duplex=False)
    process = context.Process(
        target=_child,
        args=(sender, fn, kwargs, dict(os.environ), timeout),
        daemon=True,
    )
    try:
        process.start()
    except BaseException:
        receiver.close()
        sender.close()
        raise
    sender.close()
    timed_out = False
    try:
        if not receiver.poll(timeout + GRACE_SECONDS):
            timed_out = True
            logger.warning("tool stopped after %ss tool=%s", timeout, getattr(fn, "__name__", "tool"))
            raise ProcessingFailedError("The conversion took too long and was stopped.")
        try:
            status, payload = receiver.recv()
        except (EOFError, OSError):
            process.join(2)
            logger.error("tool process ended without a result exitcode=%s", process.exitcode)
            raise ProcessingFailedError() from None
    finally:
        receiver.close()
        _stop(process, force=timed_out)
    if status == "ok":
        return payload
    if status == "app_error" and isinstance(payload, AppError):
        raise payload
    raise ProcessingFailedError()


def _child(sender, fn, kwargs, env: dict[str, str], timeout: float) -> None:
    # Own process group, so a timeout can stop helpers this job started too.
    if hasattr(os, "setsid"):
        try:
            os.setsid()
        except OSError:
            pass
    # A forked child inherits the environment from when the fork server started.
    os.environ.clear()
    os.environ.update(env)
    _configure_logging()

    from app.config import get_settings
    from app.services.convert import commands

    get_settings.cache_clear()
    commands.set_deadline(time.monotonic() + timeout)
    try:
        message: tuple[str, Any] = ("ok", fn(**kwargs))
    except AppError as exc:
        message = ("app_error", exc)
    except BaseException:
        logging.getLogger("convarter.worker").exception("tool failed tool=%s", getattr(fn, "__name__", "tool"))
        message = ("crash", None)
    try:
        sender.send(message)
    except Exception:
        logging.getLogger("convarter.worker").exception("tool result could not be returned")
        try:
            sender.send(("crash", None))
        except Exception:
            pass
    finally:
        sender.close()


def _stop(process: multiprocessing.process.BaseProcess, *, force: bool) -> None:
    if not force:
        process.join(5)
    if process.is_alive():
        _kill(process)
        process.join(5)
    if not process.is_alive():
        process.close()


def _kill(process: multiprocessing.process.BaseProcess) -> None:
    pid = process.pid
    if pid is not None and hasattr(os, "killpg"):
        try:
            os.killpg(pid, signal.SIGKILL)
            return
        except (ProcessLookupError, PermissionError):
            # The child had not created its own group yet. Stop just the child.
            pass
    process.kill()


def _configure_logging() -> None:
    if logging.getLogger().handlers:
        return
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
