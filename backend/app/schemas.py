"""Public API models. These never include filesystem paths."""

from pydantic import BaseModel, Field


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody


class LimitsResponse(BaseModel):
    max_file_size_mb: int
    max_total_size_mb: int
    max_files: int
    max_pages: int
    job_ttl_seconds: int


class ToolInfo(BaseModel):
    slug: str
    method: str
    path: str


class MetaResponse(BaseModel):
    name: str
    limits: LimitsResponse
    tools: list[ToolInfo]


class JobResponse(BaseModel):
    job_id: str
    filename: str
    media_type: str
    size_bytes: int
    download_url: str
    expires_in_seconds: int
    meta: dict[str, int | float | str] = Field(default_factory=dict)
