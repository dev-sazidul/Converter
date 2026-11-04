"""Page range parsing."""

import pytest

from app.errors import InvalidOptionError, InvalidRangeError
from app.services.pdf.ranges import (
    check_total,
    chunk_pages,
    parse_pages,
    parse_range_groups,
    unique_groups,
)


def test_groups_and_flatten():
    groups = parse_range_groups("1-3,5", 6)
    assert groups == [[0, 1, 2], [4]]
    assert parse_pages("1-3,5", 6) == [0, 1, 2, 4]
    assert parse_pages("all", 3) == [0, 1, 2]


def test_rejects_bad_ranges():
    with pytest.raises(InvalidRangeError):
        parse_range_groups("", 3)
    with pytest.raises(InvalidRangeError):
        parse_range_groups("0", 3)
    with pytest.raises(InvalidRangeError):
        parse_range_groups("3-1", 3)
    with pytest.raises(InvalidRangeError):
        parse_range_groups("1-4", 3)
    with pytest.raises(InvalidRangeError):
        parse_range_groups("1,,2", 3)
    with pytest.raises(InvalidRangeError):
        parse_range_groups("abc", 3)


def test_repeated_pages_are_listed_once():
    assert parse_pages("1-3,2,3-4,1", 5) == [0, 1, 2, 3]
    assert len(parse_pages(",".join(["1-150"] * 333), 150)) == 150
    assert unique_groups([[0, 1], [0, 1], [2], [0, 1]]) == [[0, 1], [2]]


def test_overlapping_ranges_have_a_total_limit():
    check_total([[0, 1, 2], [1, 2]], 5)
    with pytest.raises(InvalidRangeError, match="6 pages"):
        check_total([[0, 1, 2], [1, 2, 3]], 5)


def test_interval_chunks():
    assert chunk_pages(5, 2) == [[0, 1], [2, 3], [4]]
    with pytest.raises(InvalidOptionError):
        chunk_pages(5, 0)
    with pytest.raises(InvalidRangeError):
        chunk_pages(5, 6)
