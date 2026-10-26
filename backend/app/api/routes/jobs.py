"""Authorized downloads for completed jobs."""

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.get("/{job_id}/download")
def download_job(job_id: str, request: Request) -> FileResponse:
    job = request.app.state.store.get_ready(job_id)
    return FileResponse(
        path=job.output_path,
        media_type=job.media_type,
        filename=job.download_name,
        content_disposition_type="attachment",
        headers={"Cache-Control": "no-store"},
    )
