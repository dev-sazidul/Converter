# Network Security & SSRF Hardening (`html-to-pdf`)

## Application-Layer Protections
1. **Single-Resolution IP Pinning (`backend/app/services/convert/html_policy.py`):**
   - `resolve_public_url()` validates scheme (`http`/`https`), rejects embedded credentials, blocked hostnames (`localhost`, `.local`, `.internal`, `metadata.google.internal`, etc.), and resolves DNS once in Python.
   - Every resolved IP is checked against loopback, private (`RFC 1918`), link-local (`169.254.0.0/16` / `fe80::/10`), CGNAT (`100.64.0.0/10`), multicast, reserved, and IPv4-mapped IPv6 ranges.
   - `fetch_pinned_public_url()` connects directly to the validated IP over `socket.create_connection((pinned_ip, port))` (with TLS SNI + certificate verification for HTTPS) instead of letting the HTTP client or Chromium re-resolve DNS.
   - Automatic HTTP redirect following is disabled; every `3xx` `Location` target is re-validated through `resolve_public_url()` up to 5 hops.
2. **Chromium Lock (`backend/app/services/convert/html_to_pdf.py`):**
   - Chromium is launched with `--host-resolver-rules=MAP * ~NOTFOUND` so Chromium's own network stack cannot perform independent DNS lookups.
   - All `http://` and `https://` requests are intercepted via `page.route("**/*")` and fulfilled through `fetch_pinned_public_url()`.
   - Service workers (`service_workers="block"`), WebSockets, `file://`, and uploaded-HTML scripts/network access are disabled.

## Required Host / Infrastructure Firewall Rules
Application-level pinning cannot replace host-level network isolation if the host itself routes internal traffic. On the production Docker host, enforce egress rules on the `DOCKER-USER` chain for the backend egress bridge (`br-bc-egress` defined in `docker-compose.yml`):

```bash
# Block backend egress to metadata, loopback, link-local, CGNAT, and RFC1918 ranges
iptables -I DOCKER-USER -i br-bc-egress -d 169.254.0.0/16 -j DROP
iptables -I DOCKER-USER -i br-bc-egress -d 127.0.0.0/8 -j DROP
iptables -I DOCKER-USER -i br-bc-egress -d 10.0.0.0/8 -j DROP
iptables -I DOCKER-USER -i br-bc-egress -d 172.16.0.0/12 -j DROP
iptables -I DOCKER-USER -i br-bc-egress -d 192.168.0.0/16 -j DROP
iptables -I DOCKER-USER -i br-bc-egress -d 100.64.0.0/10 -j DROP

# IPv6 equivalents (if IPv6 is enabled on Docker)
ip6tables -I DOCKER-USER -i br-bc-egress -d ::1/128 -j DROP
ip6tables -I DOCKER-USER -i br-bc-egress -d fe80::/10 -j DROP
ip6tables -I DOCKER-USER -i br-bc-egress -d fc00::/7 -j DROP
```

Alternatively, if `html-to-pdf` URL mode is not required, set `egress_net` to `internal: true` in `docker-compose.yml` to disable all outbound internet access from the backend container.
