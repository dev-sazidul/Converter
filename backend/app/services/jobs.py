"""Job directories and download authorization.

Each job gets its own directory under the configured storage root. Downloads are
served only from the output path recorded for that job. Nothing in here returns
a filesystem path to the client.
"""

from __future__ import annotations

import os
import re
import shutil
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from app.errors import NotFoundError, ProcessingFailedError

_JOB_ID = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
)


@dataclass
class SavedFile:
    path: Path
    display_name: str
    size: int
    pages: int | None = None


@dataclass
class ProcessResult:
    path: Path
    download_name: str
    media_type: str
    meta: dict[str, int | float | str] = field(default_factory=dict)


@dataclass
class Job:
    id: str
    tool: str
    directory: Path
    created_at: float
    status: str = "pending"
    output_path: Path | None = None
    download_name: str | None = None
    media_type: str | None = None
    meta: dict[str, int | float | str] = field(default_factory=dict)


class JobStore:
    def __init__(self, root: Path, ttl_seconds: int) -> None:
        self.root = root
        self.ttl_seconds = ttl_seconds
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def prepare(self) -> None:
        """Create storage and drop leftovers from a previous process."""
        self.root.mkdir(parents=True, exist_ok=True)
        self.root = self.root.resolve()
        os.chmod(self.root, 0o700)
        with self._lock:
            self._jobs.clear()
            for child in list(self.root.iterdir()):
                self._remove_path(child)

    def create(self, tool: str) -> Job:
        job_id = str(uuid.uuid4())
        directory = self.root / job_id
        inputs = directory / "inputs"
        inputs.mkdir(parents=True, mode=0o700)
        os.chmod(directory, 0o700)
        job = Job(id=job_id, tool=tool, directory=directory, created_at=time.time())
        with self._lock:
            self._jobs[job_id] = job
        return job

    def complete(self, job: Job, result: ProcessResult) -> None:
        output = result.path.resolve()
        root = job.directory.resolve()
        if not output.is_relative_to(root) or not output.is_file() or output.stat().st_size <= 0:
            raise ProcessingFailedError()
        with self._lock:
            current = self._jobs.get(job.id)
            if current is None:
                raise ProcessingFailedError()
            current.output_path = output
            current.download_name = result.download_name
            current.media_type = result.media_type
            current.meta = result.meta
            current.status = "ready"

    def discard(self, job: Job) -> None:
        with self._lock:
            self._jobs.pop(job.id, None)
        self._remove_path(job.directory)

    def delete_inputs(self, job: Job) -> None:
        self._remove_path(job.directory / "inputs")
        self._remove_path(job.directory / "parts")

    def get_ready(self, job_id: str) -> Job:
        if not _JOB_ID.match(job_id or ""):
            raise NotFoundError()
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None or job.status != "ready" or job.output_path is None:
                raise NotFoundError()
            if self._expired(job):
                expired = job
            else:
                expired = None
        if expired is not None:
            self.discard(expired)
            raise NotFoundError()
        output = job.output_path.resolve()
        if not output.is_file() or not output.is_relative_to(job.directory.resolve()):
            raise NotFoundError()
        return job

    def cleanup_expired(self) -> int:
        with self._lock:
            expired = [job for job in self._jobs.values() if self._expired(job)]
        for job in expired:
            self.discard(job)
        return len(expired)

    def _expired(self, job: Job) -> bool:
        return (time.time() - job.created_at) >= self.ttl_seconds

    def _remove_path(self, path: Path) -> None:
        if not path.exists() and not path.is_symlink():
            return
        if path.is_symlink():
            path.unlink(missing_ok=True)
            return
        resolved = path.resolve()
        if not resolved.is_relative_to(self.root):
            return
        if resolved.is_dir():
            shutil.rmtree(resolved, ignore_errors=True)
        else:
            resolved.unlink(missing_ok=True)
