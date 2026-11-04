"""Test documents."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw
from pypdf import PdfWriter


def pdf_bytes(lines: list[str]) -> bytes:
    document = pymupdf.open()
    for line in lines:
        page = document.new_page()
        page.insert_text((72, 80), line, fontsize=18)
    buffer = BytesIO()
    document.save(buffer)
    document.close()
    return buffer.getvalue()


def encrypted_pdf_bytes() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    writer.encrypt("secret")
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def image_bytes(size: tuple[int, int], color: tuple[int, int, int], kind: str = "jpeg") -> bytes:
    image = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(image)
    draw.rectangle((8, 8, size[0] - 8, size[1] - 8), outline=(255, 255, 255), width=4)
    buffer = BytesIO()
    if kind == "png":
        image.save(buffer, format="PNG")
    else:
        image.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


def heavy_image_pdf_bytes() -> bytes:
    image = Image.new("RGB", (1400, 1800), (248, 246, 242))
    draw = ImageDraw.Draw(image)
    for index in range(36):
        color = (30 + (index * 6) % 180, 70, 120)
        draw.ellipse((30, 20 + index * 46, 1320, 180 + index * 46), fill=color)
    payload = BytesIO()
    image.save(payload, format="PNG", compress_level=0)
    document = pymupdf.open()
    page = document.new_page(width=595, height=842)
    page.insert_image(page.rect, stream=payload.getvalue())
    buffer = BytesIO()
    document.save(buffer, deflate=False, garbage=0)
    document.close()
    return buffer.getvalue()


def write_file(path: Path, payload: bytes) -> None:
    path.write_bytes(payload)


def huge_page_pdf_bytes(points: float = 14_400) -> bytes:
    """A one-page PDF whose page is 200 inches square, the largest size the PDF spec allows."""
    document = pymupdf.open()
    page = document.new_page(width=points, height=points)
    page.insert_text((72, 120), "HUGE PAGE", fontsize=72)
    buffer = BytesIO()
    document.save(buffer)
    document.close()
    return buffer.getvalue()


# Stand-ins for tool functions. The job worker runs tools in a child process, which
# imports them by module path, so they must live at module level.


def explode_with_secret(**_kwargs) -> None:
    raise RuntimeError("secret-token-do-not-leak /tmp/private")


def sleep_forever(**_kwargs) -> None:
    import time

    time.sleep(120)


def exit_abruptly(**_kwargs) -> None:
    import os

    os._exit(3)
