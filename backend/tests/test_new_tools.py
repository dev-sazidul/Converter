"""End-to-end API tests for the 8 new PDF tools and page preview."""

from __future__ import annotations

import io
import json

import pymupdf
import pytest
from PIL import Image, ImageDraw
from pypdf import PdfReader

from tests.factories import pdf_bytes


def _files(*items: tuple[str, bytes, str]):
    return [("files", (name, data, media)) for name, data, media in items]


def _png_bytes(width: int = 120, height: int = 50, text: str | None = None) -> bytes:
    img = Image.new("RGBA", (width, height), (255, 255, 255, 0) if text is None else (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)
    if text:
        draw.text((10, 15), text, fill=(0, 0, 0, 255))
    else:
        draw.rectangle([10, 10, width - 10, height - 10], outline=(12, 95, 90, 255), width=3)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_protect_and_unlock_pdf(client):
    source = pdf_bytes(["Secret Page 1", "Secret Page 2"])

    # Protect
    res = client.post(
        "/api/v1/tools/protect",
        data={
            "user_password": "my-secret-password",
            "owner_password": "",
            "allow_print": "true",
            "allow_copy": "false",
            "allow_modify": "false",
        },
        files=_files(("secret.pdf", source, "application/pdf")),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["meta"]["encryption"] == "AES-256"

    dl = client.get(body["download_url"])
    assert dl.status_code == 200
    protected_bytes = dl.content

    reader = pymupdf.open(stream=protected_bytes, filetype="pdf")
    assert reader.is_encrypted
    assert reader.needs_pass
    assert reader.authenticate("wrong-pass") == 0
    assert reader.authenticate("my-secret-password") != 0
    assert reader.page_count == 2
    reader.close()

    # Unlock without authorization checkbox fails
    no_auth = client.post(
        "/api/v1/tools/unlock",
        data={"password": "my-secret-password", "authorized": "false"},
        files=_files(("locked.pdf", protected_bytes, "application/pdf")),
    )
    assert no_auth.status_code == 400

    # Unlock with wrong password fails
    bad_pw = client.post(
        "/api/v1/tools/unlock",
        data={"password": "wrong-password", "authorized": "true"},
        files=_files(("locked.pdf", protected_bytes, "application/pdf")),
    )
    assert bad_pw.status_code == 400

    # Unlock with correct password succeeds
    unlocked = client.post(
        "/api/v1/tools/unlock",
        data={"password": "my-secret-password", "authorized": "true"},
        files=_files(("locked.pdf", protected_bytes, "application/pdf")),
    )
    assert unlocked.status_code == 200, unlocked.text
    dl2 = client.get(unlocked.json()["download_url"])
    assert dl2.status_code == 200
    doc = pymupdf.open(stream=dl2.content, filetype="pdf")
    assert not doc.is_encrypted
    assert doc.page_count == 2
    assert "Secret Page 1" in doc[0].get_text()
    doc.close()


def test_repair_pdf_recovers_damaged_xref_and_rejects_garbage(client):
    valid = pdf_bytes(["Recovered 1", "Recovered 2"])
    # Truncate the xref/EOF trailer so the PDF is structurally damaged
    damaged = valid[: valid.rfind(b"xref")]

    res = client.post(
        "/api/v1/tools/repair",
        files=_files(("damaged.pdf", damaged, "application/pdf")),
    )
    assert res.status_code == 200, res.text
    dl = client.get(res.json()["download_url"])
    assert dl.status_code == 200
    doc = pymupdf.open(stream=dl.content, filetype="pdf")
    assert doc.page_count == 2
    doc.close()

    # Unrecoverable garbage with %PDF header
    garbage = b"%PDF-1.4\nnot-a-real-pdf-object-at-all\n"
    bad = client.post(
        "/api/v1/tools/repair",
        files=_files(("broken.pdf", garbage, "application/pdf")),
    )
    assert bad.status_code == 400


def test_page_numbers(client):
    source = pdf_bytes(["First", "Second", "Third"])
    res = client.post(
        "/api/v1/tools/page-numbers",
        data={
            "position": "bottom-right",
            "format": "page_n_of_total",
            "start_number": "10",
            "font": "helv",
            "font_size": "12",
            "color": "#0C5F5A",
            "pages": "1-3",
        },
        files=_files(("doc.pdf", source, "application/pdf")),
    )
    assert res.status_code == 200, res.text
    dl = client.get(res.json()["download_url"])
    assert dl.status_code == 200
    doc = pymupdf.open(stream=dl.content, filetype="pdf")
    assert "Page 10 of 12" in doc[0].get_text()
    assert "Page 12 of 12" in doc[2].get_text()
    doc.close()


def test_watermark_text_and_image(client):
    source = pdf_bytes(["Page A", "Page B"])

    res_text = client.post(
        "/api/v1/tools/watermark",
        data={
            "mode": "text",
            "text": "CONFIDENTIAL",
            "font_size": "42",
            "color": "#0C5F5A",
            "opacity": "0.3",
            "rotation": "-45",
            "position": "center",
            "pages": "all",
        },
        files=_files(("doc.pdf", source, "application/pdf")),
    )
    assert res_text.status_code == 200, res_text.text
    dl1 = client.get(res_text.json()["download_url"])
    assert dl1.status_code == 200
    doc1 = pymupdf.open(stream=dl1.content, filetype="pdf")
    assert len(doc1[0].get_images()) >= 1
    doc1.close()

    wm_png = _png_bytes(100, 40)
    res_img = client.post(
        "/api/v1/tools/watermark",
        data={
            "mode": "image",
            "opacity": "0.4",
            "rotation": "0",
            "position": "bottom-right",
            "scale": "0.3",
            "pages": "1",
        },
        files=[
            ("files", ("doc.pdf", source, "application/pdf")),
            ("watermark_image", ("logo.png", wm_png, "image/png")),
        ],
    )
    assert res_img.status_code == 200, res_img.text
    dl2 = client.get(res_img.json()["download_url"])
    assert dl2.status_code == 200
    doc2 = pymupdf.open(stream=dl2.content, filetype="pdf")
    assert len(doc2[0].get_images()) >= 1
    assert len(doc2[1].get_images()) == 0
    doc2.close()


def test_ocr_pdf_creates_searchable_pdf(client):
    # Create a scanned-style image-only PDF with clear text
    img = Image.new("RGB", (600, 200), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((40, 80), "BESTCONVERT OCR TEST", fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    scan_doc = pymupdf.open()
    page = scan_doc.new_page(width=600, height=200)
    page.insert_image(page.rect, stream=buf.getvalue())
    scan_bytes = scan_doc.tobytes()
    scan_doc.close()

    res = client.post(
        "/api/v1/tools/ocr",
        data={"language": "eng", "dpi": "150", "pages": "all"},
        files=_files(("scan.pdf", scan_bytes, "application/pdf")),
    )
    assert res.status_code == 200, res.text
    dl = client.get(res.json()["download_url"])
    assert dl.status_code == 200
    out_doc = pymupdf.open(stream=dl.content, filetype="pdf")
    assert out_doc.page_count == 1
    extracted = out_doc[0].get_text().upper()
    out_doc.close()
    assert "OCR" in extracted or "BESTCONVERT" in extracted


def test_preview_sign_and_edit_pdf(client):
    source = pdf_bytes(["Original Text Line", "Second Page"])

    # Preview
    prev = client.post(
        "/api/v1/tools/preview",
        data={"page": "1", "include_text": "true"},
        files=_files(("doc.pdf", source, "application/pdf")),
    )
    assert prev.status_code == 200, prev.text
    prev_json = prev.json()
    assert prev_json["page_count"] == 2
    assert prev_json["image"].startswith("data:image/jpeg;base64,")
    assert len(prev_json["text_blocks"]) >= 1

    # Sign PDF
    sig_png = _png_bytes(160, 60)
    placements = json.dumps([{"page": 1, "x": 0.6, "y": 0.7, "width": 0.25, "height": 0.08}])
    signed = client.post(
        "/api/v1/tools/sign",
        data={"placements": placements},
        files=[
            ("files", ("doc.pdf", source, "application/pdf")),
            ("signature_image", ("sig.png", sig_png, "image/png")),
        ],
    )
    assert signed.status_code == 200, signed.text
    dl_sig = client.get(signed.json()["download_url"])
    assert dl_sig.status_code == 200
    sig_doc = pymupdf.open(stream=dl_sig.content, filetype="pdf")
    assert len(sig_doc[0].get_images()) >= 1
    sig_doc.close()

    # Edit PDF (replace text + add text + highlight rect + image)
    block = prev_json["text_blocks"][0]
    ops = json.dumps(
        [
            {
                "type": "replace_text",
                "page": 1,
                "x": block["x"],
                "y": block["y"],
                "width": max(0.3, block["w"]),
                "height": max(0.05, block["h"]),
                "text": "Updated Text Line",
                "font_size": 12,
                "color": "#132421",
            },
            {
                "type": "text",
                "page": 2,
                "x": 0.1,
                "y": 0.2,
                "width": 0.5,
                "height": 0.1,
                "text": "Added Note",
                "font_size": 14,
                "color": "#0C5F5A",
            },
            {
                "type": "rect",
                "page": 1,
                "x": 0.1,
                "y": 0.4,
                "width": 0.3,
                "height": 0.05,
                "color": "#FDE047",
                "opacity": 0.35,
                "filled": True,
            },
            {
                "type": "image",
                "page": 2,
                "x": 0.5,
                "y": 0.5,
                "width": 0.25,
                "height": 0.1,
                "image_index": 0,
            },
        ]
    )
    edited = client.post(
        "/api/v1/tools/edit",
        data={"operations": ops},
        files=[
            ("files", ("doc.pdf", source, "application/pdf")),
            ("images", ("stamp.png", sig_png, "image/png")),
        ],
    )
    assert edited.status_code == 200, edited.text
    dl_edit = client.get(edited.json()["download_url"])
    assert dl_edit.status_code == 200
    edit_doc = pymupdf.open(stream=dl_edit.content, filetype="pdf")
    assert "Updated Text Line" in edit_doc[0].get_text()
    assert "Added Note" in edit_doc[1].get_text()
    assert len(edit_doc[1].get_images()) >= 1
    edit_doc.close()
