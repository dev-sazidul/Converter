"""Conversion tools: real output files, rejected uploads, and download bytes."""

from __future__ import annotations

import io
import re
import zipfile
from pathlib import Path

import pymupdf
import pytest
from docx import Document
from openpyxl import Workbook, load_workbook
from pptx import Presentation
from pptx.util import Inches

from app.errors import InvalidOptionError, ProcessingFailedError
from app.services.convert.commands import run_command
from app.services.convert.html_policy import normalize_public_url
from tests.factories import encrypted_pdf_bytes, image_bytes, pdf_bytes


def _files(*pairs: tuple[str, bytes, str]):
    return [("files", (name, payload, mime)) for name, payload, mime in pairs]


def _download(client, body: dict) -> bytes:
    response = client.get(body["download_url"])
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    assert "Traceback" not in response.text
    assert "/Users/" not in response.text
    return response.content


def _docx_bytes() -> bytes:
    document = Document()
    document.add_paragraph("Hello Convarter")
    document.add_paragraph("Second paragraph on the same page.")
    document.add_page_break()
    document.add_paragraph("Page two of the memo")
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def _xlsx_bytes() -> bytes:
    workbook = Workbook()
    first = workbook.active
    first.title = "Stock"
    first.append(["Item", "Qty"])
    first.append(["Apples", 3])
    second = workbook.create_sheet("More")
    second.append(["Pears", 5])
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _pptx_bytes() -> bytes:
    presentation = Presentation()
    layout = presentation.slide_layouts[6]
    for text in ("Quarterly review", "Appendix"):
        slide = presentation.slides.add_slide(layout)
        box = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(6), Inches(1))
        box.text_frame.text = text
    buffer = io.BytesIO()
    presentation.save(buffer)
    return buffer.getvalue()


def _table_pdf() -> bytes:
    document = pymupdf.open()
    pages = [
        [["Item", "Qty"], ["Apples", "3"], ["Pears", "5"]],
        [["Item", "Qty"], ["Plums", "2"]],
    ]
    for rows in pages:
        page = document.new_page()
        shape = page.new_shape()
        top, left, row_height, column_width = 72, 72, 28, 160
        for row_index, row in enumerate(rows):
            for column_index, value in enumerate(row):
                rect = pymupdf.Rect(
                    left + column_index * column_width,
                    top + row_index * row_height,
                    left + (column_index + 1) * column_width,
                    top + (row_index + 1) * row_height,
                )
                shape.draw_rect(rect)
                page.insert_text((rect.x0 + 8, rect.y1 - 8), value, fontsize=12)
        shape.finish(color=(0, 0, 0), width=0.6)
        shape.commit()
    buffer = io.BytesIO()
    document.save(buffer)
    document.close()
    return buffer.getvalue()


def _illustrated_pdf() -> bytes:
    document = pymupdf.open()
    first = document.new_page()
    first.insert_text((72, 72), "ALPHA PAGE", fontsize=18)
    first.insert_image(pymupdf.Rect(72, 100, 220, 200), stream=image_bytes((80, 60), (20, 90, 80)))
    second = document.new_page()
    second.insert_text((72, 72), "BETA PAGE", fontsize=18)
    buffer = io.BytesIO()
    document.save(buffer)
    document.close()
    return buffer.getvalue()


def test_command_timeout_stops_the_process(tmp_path: Path):
    with pytest.raises(ProcessingFailedError, match="too long"):
        run_command(["sleep", "5"], timeout=1, cwd=tmp_path)


def test_pdf_to_word_keeps_pages_text_and_image(client):
    response = client.post(
        "/api/v1/tools/pdf-to-word",
        files=_files(("report.pdf", _illustrated_pdf(), "application/pdf")),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["filename"] == "report.docx"
    assert body["media_type"].endswith("wordprocessingml.document")
    assert "Complex layouts" in body["meta"]["note"]
    payload = _download(client, body)
    archive = zipfile.ZipFile(io.BytesIO(payload))
    xml = archive.read("word/document.xml")
    assert b"ALPHA PAGE" in xml
    assert b"BETA PAGE" in xml
    assert any(name.startswith("word/media/") for name in archive.namelist())


def test_pdf_to_word_handles_many_pages_and_bad_files(client):
    lines = [f"PAGE-{index}" for index in range(1, 13)]
    large = client.post(
        "/api/v1/tools/pdf-to-word",
        files=_files(("long.pdf", pdf_bytes(lines), "application/pdf")),
    )
    assert large.status_code == 200, large.text
    xml = zipfile.ZipFile(io.BytesIO(_download(client, large.json()))).read("word/document.xml")
    assert b"PAGE-1" in xml
    assert b"PAGE-12" in xml

    empty = client.post("/api/v1/tools/pdf-to-word")
    assert empty.status_code == 400
    assert empty.json()["error"]["code"] == "empty_upload"

    png = client.post(
        "/api/v1/tools/pdf-to-word",
        files=_files(("photo.png", image_bytes((20, 20), (1, 2, 3), "png"), "image/png")),
    )
    assert png.status_code == 400
    assert png.json()["error"]["code"] == "unsupported_type"

    broken = client.post(
        "/api/v1/tools/pdf-to-word",
        files=_files(("broken.pdf", b"%PDF-1.4\nnot-a-real-body", "application/pdf")),
    )
    assert broken.status_code == 400
    assert broken.json()["error"]["code"] == "invalid_pdf"
    assert "Traceback" not in broken.text

    locked = client.post(
        "/api/v1/tools/pdf-to-word",
        files=_files(("secret.pdf", encrypted_pdf_bytes(), "application/pdf")),
    )
    assert locked.status_code == 400
    assert locked.json()["error"]["code"] == "encrypted_pdf"


def test_word_excel_and_powerpoint_become_pdfs(client):
    word = client.post(
        "/api/v1/tools/word-to-pdf",
        files=_files(("memo.docx", _docx_bytes(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
    )
    assert word.status_code == 200, word.text
    word_pdf = _download(client, word.json())
    assert word_pdf.startswith(b"%PDF")
    document = pymupdf.open(stream=word_pdf, filetype="pdf")
    text = "\n".join(page.get_text() for page in document)
    assert document.page_count >= 2
    assert "Hello Convarter" in text
    assert "Page two of the memo" in text
    document.close()

    excel = client.post(
        "/api/v1/tools/excel-to-pdf",
        files=_files(("stock.xlsx", _xlsx_bytes(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
    )
    assert excel.status_code == 200, excel.text
    sheet_pdf = pymupdf.open(stream=_download(client, excel.json()), filetype="pdf")
    sheet_text = "\n".join(page.get_text() for page in sheet_pdf)
    sheet_pdf.close()
    assert "Apples" in sheet_text
    assert "Pears" in sheet_text

    slides = client.post(
        "/api/v1/tools/powerpoint-to-pdf",
        files=_files(("deck.pptx", _pptx_bytes(), "application/vnd.openxmlformats-officedocument.presentationml.presentation")),
    )
    assert slides.status_code == 200, slides.text
    deck = pymupdf.open(stream=_download(client, slides.json()), filetype="pdf")
    deck_text = "\n".join(page.get_text() for page in deck)
    assert deck.page_count == 2
    assert "Quarterly review" in deck_text
    assert "Appendix" in deck_text
    deck.close()


def test_office_uploads_reject_the_wrong_bytes(client):
    png = image_bytes((16, 16), (9, 9, 9), "png")
    disguised = client.post(
        "/api/v1/tools/word-to-pdf",
        files=_files(("notes.docx", png, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
    )
    assert disguised.status_code == 400
    assert disguised.json()["error"]["code"] == "unsupported_type"
    assert "Word" in disguised.json()["error"]["message"]

    damaged = client.post(
        "/api/v1/tools/excel-to-pdf",
        files=_files(("book.xlsx", b"PK\x03\x04not-a-zip", "application/octet-stream")),
    )
    assert damaged.status_code == 400
    assert damaged.json()["error"]["code"] == "invalid_document"

    swapped = client.post(
        "/api/v1/tools/powerpoint-to-pdf",
        files=_files(("deck.pptx", _docx_bytes(), "application/octet-stream")),
    )
    assert swapped.status_code == 400
    assert swapped.json()["error"]["code"] == "unsupported_type"

    empty = client.post("/api/v1/tools/excel-to-pdf")
    assert empty.status_code == 400
    assert empty.json()["error"]["code"] == "empty_upload"

    several = client.post(
        "/api/v1/tools/word-to-pdf",
        files=_files(
            ("a.docx", _docx_bytes(), "application/octet-stream"),
            ("b.docx", _docx_bytes(), "application/octet-stream"),
        ),
    )
    assert several.status_code == 400


def test_pdf_to_excel_extracts_tables_from_each_page(client):
    response = client.post(
        "/api/v1/tools/pdf-to-excel",
        files=_files(("tables.pdf", _table_pdf(), "application/pdf")),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["meta"]["mode"] == "tables"
    assert body["meta"]["tables_found"] == 2
    assert "Complex layouts" in body["meta"]["note"]
    workbook = load_workbook(io.BytesIO(_download(client, body)))
    values = [cell.value for sheet in workbook.worksheets for row in sheet.iter_rows() for cell in row]
    assert "Apples" in values
    assert "Plums" in values
    assert 3 in values or "3" in values

    prose = client.post(
        "/api/v1/tools/pdf-to-excel",
        files=_files(("notes.pdf", pdf_bytes(["Only a sentence"]), "application/pdf")),
    )
    assert prose.status_code == 200, prose.text
    assert prose.json()["meta"]["mode"] == "text"
    prose_book = load_workbook(io.BytesIO(_download(client, prose.json())))
    prose_values = [cell.value for row in prose_book.active.iter_rows() for cell in row]
    assert any(isinstance(value, str) and "Only a sentence" in value for value in prose_values)

    blank = pymupdf.open()
    blank.new_page()
    buffer = io.BytesIO()
    blank.save(buffer)
    blank.close()
    scanned = client.post(
        "/api/v1/tools/pdf-to-excel",
        files=_files(("scan.pdf", buffer.getvalue(), "application/pdf")),
    )
    assert scanned.status_code == 422
    assert "OCR" in scanned.json()["error"]["message"]


def test_pdf_to_powerpoint_editable_and_picture_modes(client):
    source = _illustrated_pdf()
    editable = client.post(
        "/api/v1/tools/pdf-to-powerpoint",
        data={"mode": "editable"},
        files=_files(("pages.pdf", source, "application/pdf")),
    )
    assert editable.status_code == 200, editable.text
    assert editable.json()["meta"]["mode"] == "editable"
    assert "editable text" in editable.json()["meta"]["note"]
    deck = zipfile.ZipFile(io.BytesIO(_download(client, editable.json())))
    slides = [deck.read(name) for name in deck.namelist() if name.startswith("ppt/slides/slide")]
    combined = b"\n".join(slides)
    assert b"ALPHA PAGE" in combined
    assert b"BETA PAGE" in combined

    picture = client.post(
        "/api/v1/tools/pdf-to-powerpoint",
        data={"mode": "image"},
        files=_files(("pages.pdf", source, "application/pdf")),
    )
    assert picture.status_code == 200, picture.text
    assert picture.json()["meta"]["mode"] == "image"
    assert "picture" in picture.json()["meta"]["note"]
    archive = zipfile.ZipFile(io.BytesIO(_download(client, picture.json())))
    assert any(name.startswith("ppt/media/") for name in archive.namelist())

    bad_mode = client.post(
        "/api/v1/tools/pdf-to-powerpoint",
        data={"mode": "magic"},
        files=_files(("pages.pdf", source, "application/pdf")),
    )
    assert bad_mode.status_code == 400
    assert bad_mode.json()["error"]["code"] == "invalid_option"


def test_html_file_to_pdf_blocks_scripts_and_bad_files(client):
    html = b"""<!DOCTYPE html><html><body>
    <h1>Hello HTML</h1>
    <p>Visible paragraph</p>
    <script>document.write("SCRIPTMARKER")</script>
    <iframe src="file:///etc/passwd"></iframe>
    </body></html>"""
    response = client.post(
        "/api/v1/tools/html-to-pdf",
        data={"source": "file", "page_size": "a4"},
        files=_files(("page.html", html, "text/html")),
    )
    assert response.status_code == 200, response.text
    payload = _download(client, response.json())
    assert payload.startswith(b"%PDF")
    document = pymupdf.open(stream=payload, filetype="pdf")
    text = document[0].get_text()
    document.close()
    assert "Hello HTML" in text
    assert "Visible paragraph" in text
    assert "SCRIPTMARKER" not in text
    assert "root:" not in text

    png = client.post(
        "/api/v1/tools/html-to-pdf",
        files=_files(("page.html", image_bytes((40, 40), (1, 1, 1), "png"), "text/html")),
    )
    assert png.status_code == 400
    assert png.json()["error"]["code"] == "unsupported_type"

    empty = client.post("/api/v1/tools/html-to-pdf", data={"source": "file"})
    assert empty.status_code == 400
    assert empty.json()["error"]["code"] == "empty_upload"


def test_html_urls_reject_local_targets_and_render_a_public_page(client):
    blocked = [
        "file:///etc/passwd",
        "http://127.0.0.1/secret",
        "http://169.254.169.254/latest/meta-data",
        "http://10.1.1.1/",
        "http://user:pass@example.com/",
        "http://2130706433/",
        "javascript:alert(1)",
    ]
    for url in blocked:
        response = client.post("/api/v1/tools/html-to-pdf", data={"source": "url", "url": url})
        assert response.status_code == 400, url
        assert response.json()["error"]["code"] == "invalid_option"
        assert "Traceback" not in response.text
        assert "/etc/passwd" not in response.json()["error"]["message"]
        assert "169.254.169.254" not in response.json()["error"]["message"]

    with pytest.raises(InvalidOptionError):
        normalize_public_url("http://localhost/admin")

    rendered = client.post(
        "/api/v1/tools/html-to-pdf",
        data={"source": "url", "url": "https://example.com", "page_size": "letter"},
    )
    assert rendered.status_code == 200, rendered.text
    assert rendered.json()["meta"]["source"] == "url"
    document = pymupdf.open(stream=_download(client, rendered.json()), filetype="pdf")
    assert "documentation examples" in document[0].get_text()
    document.close()


def test_pdf_to_pdfa_validates_before_download(client):
    source = pdf_bytes(["Archive me", "Second archive page"])
    response = client.post(
        "/api/v1/tools/pdf-to-pdfa",
        data={"level": "2b"},
        files=_files(("archive.pdf", source, "application/pdf")),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["meta"]["pdfa_level"] == "2b"
    assert body["meta"]["pdfa_checked"] == "yes"
    assert "veraPDF" in body["meta"]["note"]
    payload = _download(client, body)
    assert payload.startswith(b"%PDF")
    document = pymupdf.open(stream=payload, filetype="pdf")
    assert document.page_count == 2
    assert "Archive me" in document[0].get_text()
    xmp = document.get_xml_metadata() or ""
    document.close()
    assert re.search(r"pdfaid:part\s*=\s*['\"]2['\"]|>2<", xmp, re.IGNORECASE)

    bad_level = client.post(
        "/api/v1/tools/pdf-to-pdfa",
        data={"level": "9b"},
        files=_files(("archive.pdf", source, "application/pdf")),
    )
    assert bad_level.status_code == 400
    assert bad_level.json()["error"]["code"] == "invalid_option"

    png = client.post(
        "/api/v1/tools/pdf-to-pdfa",
        files=_files(("archive.pdf", image_bytes((40, 40), (3, 3, 3), "png"), "application/pdf")),
    )
    assert png.status_code == 400
    assert png.json()["error"]["code"] == "unsupported_type"
