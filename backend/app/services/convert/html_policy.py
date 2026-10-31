"""Rules for HTML uploads and public web addresses.

Uploaded HTML is rendered with scripts removed and with network access
disabled. A web address must be public http or https. Local, private, and
link-local addresses are rejected before Chromium starts, and again for every
request the page makes.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urlsplit, urlunsplit

from app.errors import InvalidOptionError

_BLOCKED_HOSTS = {
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "metadata",
}
_BLOCKED_SUFFIXES = (".local", ".localhost", ".internal", ".localdomain")
_EXTRA_NETWORKS = (
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("240.0.0.0/4"),
)
_SCRIPT = re.compile(r"(?is)<script\b[^>]*>.*?</script>|<script\b[^>]*/>")
_EMBED = re.compile(r"(?is)<iframe\b[^>]*>.*?</iframe>|<iframe\b[^>]*/>|<(object|embed)\b[^>]*>.*?</\1>|<(object|embed)\b[^>]*/>")
_UNSAFE_URL = re.compile(r"(?i)\b(?:file|javascript|data):")


def normalize_public_url(value: str) -> str:
    text = (value or "").strip()
    if not text or len(text) > 2000 or any(char in text for char in "\r\n\t\\"):
        raise InvalidOptionError("Enter a public http or https address.")
    parsed = urlsplit(text)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise InvalidOptionError("Enter a public http or https address.")
    if parsed.username or parsed.password:
        raise InvalidOptionError("That address isn't allowed.")
    host = (parsed.hostname or "").strip().lower().rstrip(".")
    if not host or host in _BLOCKED_HOSTS or host.endswith(_BLOCKED_SUFFIXES):
        raise InvalidOptionError("That address isn't allowed.")
    for ip in _addresses(host, parsed.port, parsed.scheme):
        if _blocked(ip):
            raise InvalidOptionError("That address isn't allowed.")
    path = parsed.path or "/"
    return urlunsplit((parsed.scheme, parsed.netloc, path, parsed.query, ""))


def sanitize_uploaded_html(raw: str) -> str:
    text = _SCRIPT.sub("", raw)
    text = _EMBED.sub("", text)
    text = _UNSAFE_URL.sub("", text)
    return text


def _addresses(host: str, port: int | None, scheme: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    literal = _literal_ip(host)
    if literal is not None:
        return [literal]
    resolved_port = port or (443 if scheme == "https" else 80)
    try:
        infos = socket.getaddrinfo(host, resolved_port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise InvalidOptionError("That address couldn't be found.") from exc
    addresses: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    for info in infos:
        try:
            addresses.append(ipaddress.ip_address(info[4][0]))
        except ValueError as exc:
            raise InvalidOptionError("That address isn't allowed.") from exc
    if not addresses:
        raise InvalidOptionError("That address couldn't be found.")
    return addresses


def _literal_ip(host: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address | None:
    try:
        return ipaddress.ip_address(host)
    except ValueError:
        pass
    if host.isdigit():
        try:
            return ipaddress.ip_address(int(host))
        except ValueError as exc:
            raise InvalidOptionError("That address isn't allowed.") from exc
    return None


def _blocked(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    if (
        not ip.is_global
        or ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return True
    return any(ip in network for network in _EXTRA_NETWORKS if ip.version == network.version)
