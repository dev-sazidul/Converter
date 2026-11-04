"""Limits that keep one request from exhausting the server, and the internal token."""

from __future__ import annotations

import io
import time
import zipfile

import pymupdf
from PIL import Image

from app.services.pdf.merge import merge_pdfs
from tests.factories import exit_abruptly, huge_page_pdf_bytes, pdf_bytes, sleep_forever


def _files(*pairs: tuple[str, bytes, str]):
    return [("files", (name, payload, mime)) for name, payload, mime in pairs]


def _two_pdfs():
    return _files(
        ("a.pdf", pdf_bytes(["A"]), "application/pdf"),
        ("b.pdf", pdf_bytes(["B"]), "application/pdf"),
    )


def test_pdf_to_jpg_renders_each_page_once(client):
    # Repeating a range used to render the same pages again for every repeat.
    response = client.post(
        "/api/v1/tools/pdf-to-jpg",
        data={"dpi": "96", "pages": ",".join(["1-2"] * 300)},
        files=_files(("doc.pdf", pdf_bytes(["A", "B"]), "application/pdf")),
    )
    assert response.status_code == 200, response.text
    assert response.json()["meta"]["page_count"] == 2
    archive = zipfile.ZipFile(io.BytesIO(client.get(response.json()["download_url"]).content))
    assert sorted(archive.namelist()) == ["page-001.jpg", "page-002.jpg"]


def test_split_drops_repeated_ranges_and_caps_overlap(client):
    source = pdf_bytes(["P1", "P2", "P3", "P4", "P5"])
    repeated = client.post(
        "/api/v1/tools/split",
        data={"mode": "ranges", "ranges": "1-2,1-2,1-2", "separate": "true"},
        files=_files(("doc.pdf", source, "application/pdf")),
    )
    assert repeated.status_code == 200, repeated.text
    assert repeated.json()["meta"]["part_count"] == 1
    assert repeated.json()["media_type"] == "application/pdf"

    merged = client.post(
        "/api/v1/tools/split",
        data={"mode": "ranges", "ranges": "1-3,2-4"},
        files=_files(("doc.pdf", source, "application/pdf")),
    )
    assert merged.status_code == 200, merged.text
    document = pymupdf.open(stream=client.get(merged.json()["download_url"]).content, filetype="pdf")
    assert document.page_count == 4
    document.close()

    # The test client allows 12 pages. These overlapping ranges would write 13.
    overlapping = client.post(
        "/api/v1/tools/split",
        data={"mode": "ranges", "ranges": "1-5,1-4,2-5", "separate": "true"},
        files=_files(("doc.pdf", source, "application/pdf")),
    )
    assert overlapping.status_code == 400
    assert overlapping.json()["error"]["code"] == "invalid_range"
    assert "13 pages" in overlapping.json()["error"]["message"]


def test_huge_pages_render_within_the_pixel_budget(make_client):
    client = make_client(MAX_IMAGE_PIXELS="1000000")
    response = client.post(
        "/api/v1/tools/pdf-to-jpg",
        data={"dpi": "200", "pages": "1"},
        files=_files(("poster.pdf", huge_page_pdf_bytes(), "application/pdf")),
    )
    assert response.status_code == 200, response.text
    assert response.json()["meta"]["reduced_pages"] == 1
    assert "lower resolution" in response.json()["meta"]["note"]
    image = Image.open(io.BytesIO(client.get(response.json()["download_url"]).content))
    assert image.width * image.height <= 1_000_000

    # PowerPoint slides can be at most 56 inches wide, so use a 4000 pt page here.
    slides = client.post(
        "/api/v1/tools/pdf-to-powerpoint",
        data={"mode": "image"},
        files=_files(("poster.pdf", huge_page_pdf_bytes(4000), "application/pdf")),
    )
    assert slides.status_code == 200, slides.text


def test_slow_tools_are_stopped(make_client, monkeypatch):
    client = make_client(CONVERSION_TIMEOUT_SECONDS="1")
    monkeypatch.setattr("app.api.routes.tools.merge_pdfs", sleep_forever)
    started = time.monotonic()
    response = client.post("/api/v1/tools/merge", files=_two_pdfs())
    elapsed = time.monotonic() - started
    assert response.status_code == 422
    assert "too long" in response.json()["error"]["message"]
    assert elapsed < 20
    # The slot was released, so the next job runs.
    monkeypatch.setattr("app.api.routes.tools.merge_pdfs", merge_pdfs)
    assert client.post("/api/v1/tools/merge", files=_two_pdfs()).status_code == 200


def test_a_crashing_tool_does_not_take_down_the_api(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.tools.merge_pdfs", exit_abruptly)
    response = client.post("/api/v1/tools/merge", files=_two_pdfs())
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "processing_failed"
    assert client.get("/api/health").status_code == 200


def test_busy_when_every_slot_is_taken(make_client):
    client = make_client(MAX_CONCURRENT_JOBS="1", QUEUE_TIMEOUT_SECONDS="1")
    slots = client.app.state.job_slots
    client.portal.call(slots.acquire)
    try:
        response = client.post("/api/v1/tools/merge", files=_two_pdfs())
    finally:
        client.portal.call(slots.release)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "busy"
    assert client.post("/api/v1/tools/merge", files=_two_pdfs()).status_code == 200


def test_converter_token_is_required_when_set(make_client):
    client = make_client(CONVERTER_TOKEN="internal-secret")
    assert client.get("/api/health").status_code == 200

    missing = client.get("/api/v1/meta")
    assert missing.status_code == 401
    assert missing.json()["error"]["code"] == "unauthorized"
    wrong = client.get("/api/v1/meta", headers={"X-Converter-Token": "guess"})
    assert wrong.status_code == 401

    headers = {"X-Converter-Token": "internal-secret"}
    assert client.get("/api/v1/meta", headers=headers).status_code == 200
    merged = client.post("/api/v1/tools/merge", files=_two_pdfs(), headers=headers)
    assert merged.status_code == 200, merged.text
    assert client.get(merged.json()["download_url"]).status_code == 401
    assert client.get(merged.json()["download_url"], headers=headers).status_code == 200
