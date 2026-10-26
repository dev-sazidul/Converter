#!/usr/bin/env bash
# Check the public proxy, then merge two PDFs through it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

require_env_file
load_layout

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "_" ] && [ -f "$DATA_DIR/certbot/live/$DOMAIN/fullchain.pem" ]; then
  base="https://$DOMAIN"
  curl_opts=(--resolve "$DOMAIN:443:127.0.0.1" --fail --silent --show-error)
else
  base="http://127.0.0.1:${HTTP_PORT}"
  curl_opts=(--fail --silent --show-error)
fi

healthz="$(curl "${curl_opts[@]}" "$base/healthz")"
printf '%s' "$healthz" | grep -q ok
api_health="$(curl "${curl_opts[@]}" "$base/api/health")"
printf '%s' "$api_health" | grep -q '"status":"ok"'

cd "$APP_DIR"
compose exec -T backend python -c '
from pathlib import Path
from pypdf import PdfWriter
for name in ("a.pdf", "b.pdf"):
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    with Path("/tmp").joinpath(name).open("wb") as handle:
        writer.write(handle)
'
compose cp backend:/tmp/a.pdf "$work/a.pdf"
compose cp backend:/tmp/b.pdf "$work/b.pdf"
compose exec -T backend rm -f /tmp/a.pdf /tmp/b.pdf

response="$(curl "${curl_opts[@]}" -X POST "$base/api/v1/tools/merge" \
  -F "files=@$work/a.pdf;type=application/pdf" \
  -F "files=@$work/b.pdf;type=application/pdf")"
download_url="$(printf '%s' "$response" | sed -n 's/.*"download_url":"\([^"]*\)".*/\1/p')"
case "$download_url" in
  /api/v1/jobs/*) ;;
  *)
    echo "Merge did not return a download URL." >&2
    exit 1
    ;;
esac
curl "${curl_opts[@]}" -o "$work/merged.pdf" "$base$download_url"
magic="$(head -c 4 "$work/merged.pdf")"
size="$(wc -c < "$work/merged.pdf" | tr -d ' ')"
if [ "$magic" != "%PDF" ] || [ "$size" -lt 100 ]; then
  echo "Merge did not return a PDF." >&2
  exit 1
fi
echo "Verification passed: health checks and a two-file PDF merge."
