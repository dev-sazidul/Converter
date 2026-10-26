"""Page-range parsing shared by split, rotate, and PDF-to-JPG."""

from __future__ import annotations

import re

from app.errors import InvalidOptionError, InvalidRangeError

_TOKEN = re.compile(r"^\d+(-\d+)?$")


def page_word(count: int) -> str:
    return "page" if count == 1 else "pages"


def parse_range_groups(spec: str, page_count: int) -> list[list[int]]:
    """Parse a 1-based list such as ``1-3,5`` into groups of 0-based indexes."""
    cleaned = spec.strip()
    if not cleaned:
        raise InvalidRangeError("Enter at least one page, such as 1-3 or 1,4,7-9.")
    if len(cleaned) > 2000:
        raise InvalidRangeError("That page list is too long.")
    parts = [part.strip() for part in cleaned.split(",")]
    if any(part == "" for part in parts):
        raise InvalidRangeError("There's an empty entry in the page list. Use a format like 1-3,5.")

    groups: list[list[int]] = []
    for part in parts:
        if not _TOKEN.match(part):
            raise InvalidRangeError(f"“{part}” isn't a valid page or range. Use numbers like 1-3,5.")
        if "-" in part:
            start_text, end_text = part.split("-", 1)
            start, end = int(start_text), int(end_text)
            if start < 1 or end < 1:
                raise InvalidRangeError("Page numbers start at 1.")
            if end < start:
                raise InvalidRangeError(f"Range {part} goes backwards. Put the smaller page first.")
            if start > page_count or end > page_count:
                raise InvalidRangeError(
                    f"This PDF only has {page_count} {page_word(page_count)}. {part} is outside that."
                )
            groups.append(list(range(start - 1, end)))
        else:
            number = int(part)
            if number < 1:
                raise InvalidRangeError("Page numbers start at 1.")
            if number > page_count:
                raise InvalidRangeError(
                    f"This PDF only has {page_count} {page_word(page_count)}. Page {number} is outside that."
                )
            groups.append([number - 1])
    return groups


def flatten_groups(groups: list[list[int]]) -> list[int]:
    return [page for group in groups for page in group]


def parse_pages(spec: str, page_count: int) -> list[int]:
    if spec.strip().lower() == "all":
        return list(range(page_count))
    return flatten_groups(parse_range_groups(spec, page_count))


def chunk_pages(page_count: int, interval: int) -> list[list[int]]:
    if interval < 1:
        raise InvalidOptionError("The interval must be at least 1.")
    if interval > page_count:
        raise InvalidRangeError(
            f"The interval is larger than this PDF, which has {page_count} {page_word(page_count)}."
        )
    return [list(range(start, min(start + interval, page_count))) for start in range(0, page_count, interval)]


def parse_int(value: str, *, label: str, minimum: int, maximum: int) -> int:
    try:
        number = int(str(value).strip())
    except (TypeError, ValueError) as exc:
        raise InvalidOptionError(f"{label} must be a whole number.") from exc
    if number < minimum or number > maximum:
        raise InvalidOptionError(f"{label} must be between {minimum} and {maximum}.")
    return number


def parse_choice(value: str, allowed: set[str], message: str) -> str:
    cleaned = value.strip().lower()
    if cleaned not in allowed:
        raise InvalidOptionError(message)
    return cleaned


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on"}
