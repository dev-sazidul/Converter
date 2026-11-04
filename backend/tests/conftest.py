"""Shared API test client."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def make_client(tmp_path, monkeypatch):
    clients: list[TestClient] = []

    def _make(**overrides: str) -> TestClient:
        storage = tmp_path / f"storage-{len(clients)}"
        env = {
            "STORAGE_DIR": str(storage),
            "MAX_FILE_SIZE_MB": "2",
            "MAX_TOTAL_SIZE_MB": "5",
            "MAX_FILES": "8",
            "MAX_PAGES": "12",
            "JOB_TTL_SECONDS": "3600",
            "CLEANUP_INTERVAL_SECONDS": "3600",
            "ENVIRONMENT": "test",
        }
        env.update({key: str(value) for key, value in overrides.items()})
        for key, value in env.items():
            monkeypatch.setenv(key, value)
        from app.config import get_settings
        from app.main import create_app

        get_settings.cache_clear()
        client = TestClient(create_app())
        client.__enter__()
        clients.append(client)
        return client

    yield _make
    for client in clients:
        client.__exit__(None, None, None)
    from app.config import get_settings

    get_settings.cache_clear()


@pytest.fixture()
def client(make_client) -> TestClient:
    return make_client()
