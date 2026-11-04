"""Render PDF pages to pixels within a fixed pixel budget.

A PDF can declare a page many meters wide in a few bytes. Rendering that page
at the requested DPI could need gigabytes of memory, so the resolution is
lowered until the page fits in ``MAX_IMAGE_PIXELS``.
"""

from __future__ import annotations

import math

import pymupdf

from app.config import get_settings
from app.errors import InvalidPdfError


def page_pixmap(page: pymupdf.Page, dpi: int, max_pixels: int | None = None) -> tuple[pymupdf.Pixmap, bool]:
    """Return an RGB pixmap and whether the resolution had to be lowered."""
    budget = max_pixels or get_settings().max_image_pixels
    rect = page.rect
    if rect.is_empty or rect.width <= 0 or rect.height <= 0:
        raise InvalidPdfError("A page in this PDF has no size, so it can't be rendered.")
    zoom = dpi / 72
    pixels = (rect.width * zoom) * (rect.height * zoom)
    reduced = False
    if pixels > budget:
        # Slightly under the square root so rounding up to whole pixels stays inside the budget.
        zoom *= math.sqrt(budget / pixels) * 0.999
        reduced = True
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False, colorspace=pymupdf.csRGB)
    if pixmap.width < 1 or pixmap.height < 1:
        raise InvalidPdfError("A page in this PDF is too large to render.")
    return pixmap, reduced
