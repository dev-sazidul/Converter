"""Environment-backed settings.

Local development works with the defaults. Production should set the values in
the root ``.env`` file. See ``.env.example``.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    environment: str = "development"
    # Shared secret the Next.js app sends in X-Converter-Token. Empty turns the check off.
    converter_token: str = ""
    storage_dir: Path = BACKEND_ROOT / "storage"
    max_file_size_mb: int = 25
    max_total_size_mb: int = 100
    max_files: int = 20
    max_pages: int = 150
    job_ttl_seconds: int = 3600
    cleanup_interval_seconds: int = 300
    max_image_pixels: int = 40_000_000
    allowed_dpi: str = "96,150,200"
    conversion_timeout_seconds: int = 120
    html_navigation_timeout_seconds: int = 25
    # Jobs that run at the same time. LibreOffice and Chromium each use hundreds of MB.
    max_concurrent_jobs: int = 2
    # How long a job waits for a free slot before the API answers "busy".
    queue_timeout_seconds: int = 30
    pdfa_icc_path: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator(
        "max_file_size_mb",
        "max_total_size_mb",
        "max_files",
        "max_pages",
        "cleanup_interval_seconds",
        "max_image_pixels",
        "conversion_timeout_seconds",
        "html_navigation_timeout_seconds",
        "max_concurrent_jobs",
        "queue_timeout_seconds",
    )
    @classmethod
    def must_be_positive(cls, value: int) -> int:
        if value < 1:
            raise ValueError("limit must be a positive integer")
        return value

    @field_validator("job_ttl_seconds")
    @classmethod
    def ttl_not_negative(cls, value: int) -> int:
        if value < 0:
            raise ValueError("job TTL cannot be negative")
        return value

    @property
    def max_file_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def max_total_bytes(self) -> int:
        return self.max_total_size_mb * 1024 * 1024

    @property
    def dpi_values(self) -> set[int]:
        return {int(item) for item in self.allowed_dpi.split(",") if item.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
