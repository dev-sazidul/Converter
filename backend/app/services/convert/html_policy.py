"""Rules for HTML uploads and public web addresses.

Uploaded HTML is rendered with scripts removed and with network access
disabled. A web address must be public http or https. Local, private, and
link-local addresses are rejected before connecting, and every connection
pins the validated IP address directly (preventing DNS rebinding) and
re-validates every HTTP redirect target.
"""

from __future__ import annotations

import http.client
import ipaddress
import re
import socket
import ssl
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit, urlunsplit

from app.errors import InvalidOptionError

_BLOCKED_HOSTS = {
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "metadata",
    "instance-data",
}
_BLOCKED_SUFFIXES = (".local", ".localhost", ".internal", ".localdomain")
_EXTRA_NETWORKS = (
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("240.0.0.0/4"),
)
_SCRIPT = re.compile(r"(?is)<script\b[^>]*>.*?</script>|<script\b[^>]*/>")
_EMBED = re.compile(
    r"(?is)<iframe\b[^>]*>.*?</iframe>|<iframe\b[^>]*/>|<(object|embed)\b[^>]*>.*?</\1>|<(object|embed)\b[^>]*/>"
)
_UNSAFE_URL = re.compile(r"(?i)\b(?:file|javascript|data):")

_MAX_REDIRECTS = 5
_MAX_RESOURCE_BYTES = 10 * 1024 * 1024


@dataclass(frozen=True)
class ResolvedTarget:
    url: str
    scheme: str
    host: str
    port: int
    path_and_query: str
    ip: ipaddress.IPv4Address | ipaddress.IPv6Address


def resolve_public_url(value: str) -> ResolvedTarget:
    """Validate ``value`` as a public http/https URL and resolve a safe IP once."""
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

    addresses = _addresses(host, parsed.port, parsed.scheme)
    for ip in addresses:
        if _blocked(ip):
            raise InvalidOptionError("That address isn't allowed.")

    path = parsed.path or "/"
    normalized = urlunsplit((parsed.scheme, parsed.netloc, path, parsed.query, ""))
    path_and_query = f"{path}?{parsed.query}" if parsed.query else path
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    return ResolvedTarget(
        url=normalized,
        scheme=parsed.scheme,
        host=host,
        port=port,
        path_and_query=path_and_query,
        ip=addresses[0],
    )


def normalize_public_url(value: str) -> str:
    return resolve_public_url(value).url


def sanitize_uploaded_html(raw: str) -> str:
    text = _SCRIPT.sub("", raw)
    text = _EMBED.sub("", text)
    text = _UNSAFE_URL.sub("", text)
    return text


class _PinnedHTTPConnection(http.client.HTTPConnection):
    def __init__(self, target: ResolvedTarget, timeout: float) -> None:
        super().__init__(target.host, target.port, timeout=timeout)
        self._pinned_ip = str(target.ip)

    def connect(self) -> None:
        self.sock = socket.create_connection((self._pinned_ip, self.port), self.timeout)


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, target: ResolvedTarget, timeout: float) -> None:
        try:
            import certifi

            ctx = ssl.create_default_context(cafile=certifi.where())
        except ImportError:
            ctx = ssl.create_default_context()
        super().__init__(
            target.host,
            target.port,
            timeout=timeout,
            context=ctx,
        )
        self._pinned_ip = str(target.ip)

    def connect(self) -> None:
        raw_sock = socket.create_connection((self._pinned_ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(raw_sock, server_hostname=self.host)


def fetch_pinned_public_url(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    timeout: float = 15.0,
    max_bytes: int = _MAX_RESOURCE_BYTES,
) -> tuple[int, dict[str, str], bytes]:
    """Fetch a public HTTP(S) URL by pinning the validated IP on every hop.

    Redirects are never followed automatically by the socket client; every
    ``Location`` target is re-validated through ``resolve_public_url`` first.
    """
    current_url = url
    req_method = method.upper() if method.upper() in {"GET", "HEAD"} else "GET"

    for _ in range(_MAX_REDIRECTS + 1):
        target = resolve_public_url(current_url)
        conn: http.client.HTTPConnection
        if target.scheme == "https":
            conn = _PinnedHTTPSConnection(target, timeout=timeout)
        else:
            conn = _PinnedHTTPConnection(target, timeout=timeout)

        safe_headers = {
            "Host": target.host if target.port in (80, 443) else f"{target.host}:{target.port}",
            "User-Agent": (headers or {}).get("User-Agent", "BestConvert/1.0"),
            "Accept": (headers or {}).get("Accept", "*/*"),
            "Connection": "close",
        }

        try:
            conn.request(req_method, target.path_and_query, headers=safe_headers)
            resp = conn.getresponse()
            status = resp.status
            resp_headers = {k.lower(): v for k, v in resp.getheaders()}
            if status in {301, 302, 303, 307, 308} and "location" in resp_headers:
                location = resp_headers["location"]
                current_url = urljoin(target.url, location)
                continue
            chunks: list[bytes] = []
            total = 0
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise InvalidOptionError("A remote resource exceeded the maximum allowed size.")
                chunks.append(chunk)
            return status, resp_headers, b"".join(chunks)
        finally:
            conn.close()

    raise InvalidOptionError("Too many redirects while fetching that address.")


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
