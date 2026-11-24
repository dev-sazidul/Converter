"""Security tests for SSRF, redirect validation, DNS-rebinding pinning, and public URL fetching."""

from __future__ import annotations

import socket
from unittest.mock import MagicMock, patch

import pytest

from app.errors import InvalidOptionError
from app.services.convert.html_policy import (
    fetch_pinned_public_url,
    normalize_public_url,
    resolve_public_url,
)


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/admin",
        "http://127.0.0.1:8080/",
        "http://0.0.0.0/",
        "http://10.0.0.1/internal",
        "http://172.16.0.5/",
        "http://192.168.1.1/",
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://100.64.0.1/",
        "http://2130706433/",
        "http://[::1]/",
        "http://[fe80::1]/",
        "http://[fd00:ec2::254]/latest/meta-data/",
        "http://[::ffff:127.0.0.1]/",
        "http://user:pass@example.com/",
        "file:///etc/passwd",
        "javascript:alert(1)",
        "ftp://example.com/file",
    ],
)
def test_blocks_private_loopback_metadata_and_unsafe_urls(url: str):
    with pytest.raises(InvalidOptionError):
        resolve_public_url(url)
    with pytest.raises(InvalidOptionError):
        normalize_public_url(url)


def test_pinned_fetch_prevents_dns_rebinding():
    """Simulate a TTL=0 DNS-rebinding domain: 1st lookup -> 93.184.216.34, 2nd lookup -> 127.0.0.1.

    fetch_pinned_public_url must resolve DNS once, connect directly to 93.184.216.34,
    and never perform a second DNS lookup or connect to 127.0.0.1.
    """
    calls = 0

    def fake_getaddrinfo(host, port, type=0):
        nonlocal calls
        calls += 1
        ip = "93.184.216.34" if calls == 1 else "127.0.0.1"
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, port))]

    connected_targets: list[tuple[str, int]] = []

    class FakeResp:
        status = 200

        def getheaders(self):
            return [("Content-Type", "text/html")]

        def read(self, _n=65536):
            if getattr(self, "_done", False):
                return b""
            self._done = True
            return b"<html><body>Pinned OK</body></html>"

    def fake_create_connection(addr, timeout=None):
        connected_targets.append((addr[0], addr[1]))
        return MagicMock()

    def fake_send(self, _data):
        if self.sock is None:
            self.connect()

    with (
        patch("app.services.convert.html_policy.socket.getaddrinfo", side_effect=fake_getaddrinfo),
        patch("app.services.convert.html_policy.socket.create_connection", side_effect=fake_create_connection),
        patch("app.services.convert.html_policy.http.client.HTTPConnection.send", new=fake_send),
        patch("app.services.convert.html_policy.http.client.HTTPConnection.getresponse", return_value=FakeResp()),
    ):
        status, headers, body = fetch_pinned_public_url("http://rebind.example.com/page")

    assert status == 200
    assert b"Pinned OK" in body
    assert calls == 1
    assert connected_targets == [("93.184.216.34", 80)]


def test_redirect_to_private_or_metadata_ip_is_blocked():
    """A public URL returning 302 -> http://169.254.169.254/... must be blocked before connecting."""
    connected_targets: list[tuple[str, int]] = []

    class RedirectResp:
        status = 302

        def getheaders(self):
            return [("Location", "http://169.254.169.254/latest/meta-data/")]

        def read(self, _n=65536):
            return b""

    def fake_getaddrinfo(host, port, type=0):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]

    def fake_create_connection(addr, timeout=None):
        connected_targets.append((addr[0], addr[1]))
        return MagicMock()

    def fake_send(self, _data):
        if self.sock is None:
            self.connect()

    with (
        patch("app.services.convert.html_policy.socket.getaddrinfo", side_effect=fake_getaddrinfo),
        patch("app.services.convert.html_policy.socket.create_connection", side_effect=fake_create_connection),
        patch("app.services.convert.html_policy.http.client.HTTPConnection.send", new=fake_send),
        patch("app.services.convert.html_policy.http.client.HTTPConnection.getresponse", return_value=RedirectResp()),
    ):
        with pytest.raises(InvalidOptionError):
            fetch_pinned_public_url("http://public.example.com/redirect")

    assert connected_targets == [("93.184.216.34", 80)]


def test_legitimate_public_url_fetch_succeeds():
    status, headers, body = fetch_pinned_public_url("https://example.com", timeout=15.0)
    assert status == 200
    assert "text/html" in headers.get("content-type", "")
    assert b"Example Domain" in body
