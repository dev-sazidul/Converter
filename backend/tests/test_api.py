"""API tests for real PDF processing, validation, and file cleanup."""

from __future__ import annotations

import io
import zipfile

import pymupdf
from fastapi.testclient import TestClient
from pypdf import PdfReader

from tests.factories import (
    encrypted_pdf_bytes,
    exit_abruptly,
    explode_with_secret,
    heavy_image_pdf_bytes,
    huge_page_pdf_bytes,
    image_bytes,
    pdf_bytes,
    sleep_forever,
)


def _files(*pairs: tuple[str, bytes, str]):
    return [("files", (name, payload, mime)) for name, payload, mime in pairs]


def test_health_and_meta(client):
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    meta = client.get("/api/v1/meta")
    assert meta.status_code == 200
    body = meta.json()
    assert body["name"] == "Convarter"
    assert len(body["tools"]) == 14
    assert {item["slug"] for item in body["tools"]} == {
        "merge-pdf",
        "split-pdf",
        "compress-pdf",
        "rotate-pdf",
        "pdf-to-jpg",
        "jpg-to-pdf",
        "pdf-to-word",
        "word-to-pdf",
        "pdf-to-excel",
        "excel-to-pdf",
        "pdf-to-powerpoint",
        "powerpoint-to-pdf",
        "html-to-pdf",
        "pdf-to-pdfa",
    }
    assert "/storage" not in meta.text
    assert "Traceback" not in meta.text


def test_merge_preserves_order_and_download(client):
    response = client.post(
        "/api/v1/tools/merge",
        files=_files(
            ("first.pdf", pdf_bytes(["ALPHA"]), "application/pdf"),
            ("second.pdf", pdf_bytes(["BETA"]), "application/pdf"),
        ),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["filename"] == "convarter-merged.pdf"
    assert body["meta"]["page_count"] == 2
    assert body["meta"]["output_kind"] == "pdf"
    assert "Users" not in response.text
    assert "storage" not in response.text.lower()

    download = client.get(body["download_url"])
    assert download.status_code == 200
    assert download.content.startswith(b"%PDF")
    assert "attachment" in download.headers["content-disposition"]
    assert "convarter-merged.pdf" in download.headers["content-disposition"]
    document = pymupdf.open(stream=download.content, filetype="pdf")
    assert document.page_count == 2
    assert "ALPHA" in document[0].get_text()
    assert "BETA" in document[1].get_text()
    document.close()

    job = client.app.state.store._jobs[body["job_id"]]
    assert not (job.directory / "inputs").exists()
    assert job.output_path is not None and job.output_path.exists()


def test_merge_requires_two_valid_pdfs(client):
    empty = client.post("/api/v1/tools/merge")
    assert empty.status_code == 400
    assert empty.json()["error"]["code"] == "empty_upload"

    one = client.post(
        "/api/v1/tools/merge",
        files=_files(("only.pdf", pdf_bytes(["ONE"]), "application/pdf")),
    )
    assert one.status_code == 400
    assert "two" in one.json()["error"]["message"].lower()

    fake = client.post(
        "/api/v1/tools/merge",
        files=_files(
            ("notes.pdf", b"this is not a pdf", "application/pdf"),
            ("other.pdf", pdf_bytes(["OK"]), "application/pdf"),
        ),
    )
    assert fake.status_code == 400
    assert fake.json()["error"]["code"] == "unsupported_type"

    broken = client.post(
        "/api/v1/tools/merge",
        files=_files(
            ("broken.pdf", b"%PDF-1.4\nnot-a-real-body", "application/pdf"),
            ("other.pdf", pdf_bytes(["OK"]), "application/pdf"),
        ),
    )
    assert broken.status_code == 400
    assert broken.json()["error"]["code"] == "invalid_pdf"
    assert "Traceback" not in broken.text


def test_split_ranges_pages_and_interval(client):
    source = pdf_bytes(["P1", "P2", "P3", "P4", "P5"])
    ranges = client.post(
        "/api/v1/tools/split",
        data={"mode": "ranges", "ranges": "1-2,5", "separate": "true"},
        files=_files(("doc.pdf", source, "application/pdf")),
    )
    assert ranges.status_code == 200, ranges.text
    assert ranges.json()["meta"]["output_kind"] == "zip"
    archive = zipfile.ZipFile(io.BytesIO(client.get(ranges.json()["download_url"]).content))
    names = sorted(archive.namelist())
    assert names == ["pages-1-2.pdf", "pages-5.pdf"]
    first = pymupdf.open(stream=archive.read(names[0]), filetype="pdf")
    assert "P1" in first[0].get_text()
    assert "P2" in first[1].get_text()
    first.close()

    every = client.post(
        "/api/v1/tools/split",
        data={"mode": "pages"},
        files=_files(("doc.pdf", pdf_bytes(["A", "B", "C"]), "application/pdf")),
    )
    assert every.status_code == 200, every.text
    pages = zipfile.ZipFile(io.BytesIO(client.get(every.json()["download_url"]).content))
    assert len(pages.namelist()) == 3

    interval = client.post(
        "/api/v1/tools/split",
        data={"mode": "interval", "interval": "2"},
        files=_files(("doc.pdf", source, "application/pdf")),
    )
    assert interval.status_code == 200, interval.text
    chunks = zipfile.ZipFile(io.BytesIO(client.get(interval.json()["download_url"]).content))
    assert len(chunks.namelist()) == 3


def test_split_rejects_bad_ranges(client):
    source = pdf_bytes(["A", "B"])
    cases = ["", "0", "3-1", "1-4", "abc", "1,,2"]
    for ranges in cases:
        response = client.post(
            "/api/v1/tools/split",
            data={"mode": "ranges", "ranges": ranges},
            files=_files(("doc.pdf", source, "application/pdf")),
        )
        assert response.status_code == 400, ranges
        assert response.json()["error"]["code"] == "invalid_range"

    backwards = client.post(
        "/api/v1/tools/split",
        data={"mode": "interval", "interval": "0"},
        files=_files(("doc.pdf", source, "application/pdf")),
    )
    assert backwards.status_code == 400
    assert backwards.json()["error"]["code"] == "invalid_option"


def test_compress_shrinks_image_pdf_and_keeps_text_readable(make_client):
    client = make_client(MAX_FILE_SIZE_MB="20", MAX_TOTAL_SIZE_MB="20")
    heavy = heavy_image_pdf_bytes()
    response = client.post(
        "/api/v1/tools/compress",
        data={"quality": "low"},
        files=_files(("scan.pdf", heavy, "application/pdf")),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["meta"]["saved_bytes"] > 0
    assert body["meta"]["page_count"] == 1
    download = client.get(body["download_url"])
    assert download.content.startswith(b"%PDF")
    assert len(download.content) < len(heavy)
    document = pymupdf.open(stream=download.content, filetype="pdf")
    assert document.page_count == 1
    document.close()

    text = client.post(
        "/api/v1/tools/compress",
        data={"quality": "high"},
        files=_files(("note.pdf", pdf_bytes(["Keep this sentence."]), "application/pdf")),
    )
    assert text.status_code == 200, text.text
    opened = pymupdf.open(stream=client.get(text.json()["download_url"]).content, filetype="pdf")
    assert "Keep this sentence." in opened[0].get_text()
    opened.close()


def test_rotate_selected_pages(client):
    response = client.post(
        "/api/v1/tools/rotate",
        data={"angle": "90", "pages": "1"},
        files=_files(("doc.pdf", pdf_bytes(["First", "Second"]), "application/pdf")),
    )
    assert response.status_code == 200, response.text
    reader = PdfReader(io.BytesIO(client.get(response.json()["download_url"]).content))
    assert (reader.pages[0].rotation or 0) % 360 == 90
    assert (reader.pages[1].rotation or 0) % 360 == 0

    rejected = client.post(
        "/api/v1/tools/rotate",
        data={"angle": "45"},
        files=_files(("doc.pdf", pdf_bytes(["A"]), "application/pdf")),
    )
    assert rejected.status_code == 400
    assert rejected.json()["error"]["code"] == "invalid_option"

    missing = client.post(
        "/api/v1/tools/rotate",
        data={"angle": "180", "pages": "3"},
        files=_files(("doc.pdf", pdf_bytes(["A"]), "application/pdf")),
    )
    assert missing.status_code == 400
    assert missing.json()["error"]["code"] == "invalid_range"


def test_pdf_to_jpg_and_jpg_to_pdf(client):
    single = client.post(
        "/api/v1/tools/pdf-to-jpg",
        data={"dpi": "96", "pages": "1"},
        files=_files(("doc.pdf", pdf_bytes(["A", "B"]), "application/pdf")),
    )
    assert single.status_code == 200, single.text
    assert single.json()["media_type"] == "image/jpeg"
    image = client.get(single.json()["download_url"]).content
    assert image.startswith(b"\xff\xd8\xff")

    multi = client.post(
        "/api/v1/tools/pdf-to-jpg",
        data={"dpi": "96", "pages": "all"},
        files=_files(("doc.pdf", pdf_bytes(["A", "B"]), "application/pdf")),
    )
    assert multi.status_code == 200, multi.text
    archive = zipfile.ZipFile(io.BytesIO(client.get(multi.json()["download_url"]).content))
    assert len(archive.namelist()) == 2
    assert all(name.endswith(".jpg") for name in archive.namelist())

    built = client.post(
        "/api/v1/tools/jpg-to-pdf",
        data={"page_size": "a4", "orientation": "portrait", "margin": "small"},
        files=_files(
            ("wide.jpg", image_bytes((220, 80), (20, 90, 80)), "image/jpeg"),
            ("tall.jpeg", image_bytes((80, 220), (180, 40, 40)), "image/jpeg"),
        ),
    )
    assert built.status_code == 200, built.text
    document = pymupdf.open(stream=client.get(built.json()["download_url"]).content, filetype="pdf")
    assert document.page_count == 2
    assert abs(document[0].rect.width - 595.276) < 1.5
    assert document[0].rect.height > document[0].rect.width
    document.close()

    ordered = client.post(
        "/api/v1/tools/jpg-to-pdf",
        data={"page_size": "fit", "orientation": "portrait", "margin": "none"},
        files=_files(
            ("wide.jpg", image_bytes((200, 80), (10, 10, 10)), "image/jpeg"),
            ("tall.jpg", image_bytes((80, 200), (240, 240, 240)), "image/jpeg"),
        ),
    )
    assert ordered.status_code == 200, ordered.text
    fitted = pymupdf.open(stream=client.get(ordered.json()["download_url"]).content, filetype="pdf")
    assert fitted[0].rect.width > fitted[0].rect.height
    assert fitted[1].rect.height > fitted[1].rect.width
    fitted.close()


def test_rejects_unsupported_images_and_encrypted_pdfs(client):
    gif = client.post(
        "/api/v1/tools/jpg-to-pdf",
        files=_files(("anim.gif", b"GIF89a not-really", "image/gif")),
    )
    assert gif.status_code == 400
    assert gif.json()["error"]["code"] in {"unsupported_type", "invalid_image"}

    png = client.post(
        "/api/v1/tools/jpg-to-pdf",
        files=_files(("photo.png", image_bytes((40, 40), (10, 20, 30), "png"), "image/png")),
    )
    assert png.status_code == 400
    assert png.json()["error"]["code"] == "unsupported_type"
    assert "JPG or JPEG" in png.json()["error"]["message"]

    locked = client.post(
        "/api/v1/tools/compress",
        files=_files(("locked.pdf", encrypted_pdf_bytes(), "application/pdf")),
    )
    assert locked.status_code == 400, locked.text
    assert locked.json()["error"]["code"] == "encrypted_pdf"


def test_limits(make_client):
    limited = make_client(MAX_FILE_SIZE_MB="1", MAX_TOTAL_SIZE_MB="3", MAX_PAGES="2", MAX_FILES="2")
    too_big = limited.post(
        "/api/v1/tools/compress",
        files=_files(("big.pdf", b"%PDF-" + b"0" * 1_200_000, "application/pdf")),
    )
    assert too_big.status_code == 413
    assert too_big.json()["error"]["code"] == "file_too_large"

    total = make_client(MAX_FILE_SIZE_MB="2", MAX_TOTAL_SIZE_MB="1")
    over_total = total.post(
        "/api/v1/tools/compress",
        files=_files(("big.pdf", b"%PDF-" + b"0" * 1_200_000, "application/pdf")),
    )
    assert over_total.status_code == 413
    assert over_total.json()["error"]["code"] == "total_too_large"

    pages = limited.post(
        "/api/v1/tools/rotate",
        files=_files(("long.pdf", pdf_bytes(["A", "B", "C"]), "application/pdf")),
    )
    assert pages.status_code == 400
    assert pages.json()["error"]["code"] == "too_many_pages"

    crowded = limited.post(
        "/api/v1/tools/merge",
        files=_files(
            ("a.pdf", pdf_bytes(["A"]), "application/pdf"),
            ("b.pdf", pdf_bytes(["B"]), "application/pdf"),
            ("c.pdf", pdf_bytes(["C"]), "application/pdf"),
        ),
    )
    assert crowded.status_code == 400
    assert crowded.json()["error"]["code"] == "too_many_files"


def test_download_is_limited_to_real_jobs(client):
    missing = client.get("/api/v1/jobs/not-a-uuid/download")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"
    unknown = client.get("/api/v1/jobs/11111111-1111-1111-1111-111111111111/download")
    assert unknown.status_code == 404


def test_internal_errors_stay_internal(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.tools.merge_pdfs", explode_with_secret)
    response = client.post(
        "/api/v1/tools/merge",
        files=_files(
            ("a.pdf", pdf_bytes(["A"]), "application/pdf"),
            ("b.pdf", pdf_bytes(["B"]), "application/pdf"),
        ),
    )
    assert response.status_code == 422
    assert "secret-token" not in response.text
    assert "/tmp" not in response.text
    assert response.json()["error"]["code"] == "processing_failed"


def test_expired_jobs_and_startup_purge(make_client, tmp_path, monkeypatch):
    storage = tmp_path / "leftovers"
    secret = storage / "old-job"
    secret.mkdir(parents=True)
    (secret / "secret.pdf").write_bytes(b"%PDF-1.4 secret")
    monkeypatch.setenv("STORAGE_DIR", str(storage))
    from app.config import get_settings
    from app.main import create_app

    get_settings.cache_clear()
    with TestClient(create_app()) as started:
        assert started.get("/api/health").status_code == 200
        assert not secret.exists()

    short = make_client(JOB_TTL_SECONDS="0")
    created = short.post(
        "/api/v1/tools/merge",
        files=_files(
            ("a.pdf", pdf_bytes(["A"]), "application/pdf"),
            ("b.pdf", pdf_bytes(["B"]), "application/pdf"),
        ),
    )
    assert created.status_code == 200, created.text
    expired = short.get(created.json()["download_url"])
    assert expired.status_code == 404
    assert expired.json()["error"]["code"] == "not_found"


def test_ready_download_survives_a_new_process(tmp_path, monkeypatch):
    storage = tmp_path / "keep"
    monkeypatch.setenv("STORAGE_DIR", str(storage))
    monkeypatch.setenv("JOB_TTL_SECONDS", "3600")
    from app.config import get_settings
    from app.main import create_app

    get_settings.cache_clear()
    with TestClient(create_app()) as first:
        created = first.post(
            "/api/v1/tools/merge",
            files=_files(
                ("a.pdf", pdf_bytes(["A"]), "application/pdf"),
                ("b.pdf", pdf_bytes(["B"]), "application/pdf"),
            ),
        )
        assert created.status_code == 200, created.text
        download_url = created.json()["download_url"]
        original = first.get(download_url)
        assert original.status_code == 200
        assert original.content.startswith(b"%PDF")

    get_settings.cache_clear()
    with TestClient(create_app()) as second:
        restored = second.get(download_url)
        assert restored.status_code == 200
        assert restored.content == original.content
