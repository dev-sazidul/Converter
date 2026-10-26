#!/usr/bin/env bash
# Update the checkout and recreate containers.
# Does not delete uploads, .env, certificates, or the data directory.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root through the deploy user's sudo rule." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPT_DIR/lib.sh"

require_env_file
load_layout

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Expected a git checkout at $APP_DIR." >&2
  exit 1
fi

mkdir -p "$DATA_DIR/meta" "$BIN_DIR"
git -C "$APP_DIR" rev-parse HEAD > "$DATA_DIR/meta/previous-release.txt"
git -C "$APP_DIR" fetch --prune origin main
git -C "$APP_DIR" checkout -B main origin/main
git -C "$APP_DIR" rev-parse HEAD > "$DATA_DIR/meta/current-release.txt"

chown 10001:10001 "$DATA_DIR/storage"
chmod 700 "$DATA_DIR/storage"

export IMAGE_TAG
IMAGE_TAG="$(git -C "$APP_DIR" rev-parse --short=12 HEAD)"

cd "$APP_DIR"
compose up -d --build --remove-orphans
compose ps
"$APP_DIR/deploy/verify.sh"

install -m 755 "$APP_DIR/deploy/remote-deploy.sh" "$BIN_DIR/remote-deploy.sh"
install -m 755 "$APP_DIR/deploy/rollback.sh" "$BIN_DIR/rollback.sh"
install -m 755 "$APP_DIR/deploy/verify.sh" "$BIN_DIR/verify.sh"
install -m 755 "$APP_DIR/deploy/logs.sh" "$BIN_DIR/logs.sh"
install -m 755 "$APP_DIR/deploy/ssh-dispatch.sh" "$BIN_DIR/ssh-dispatch.sh"
install -m 644 "$APP_DIR/deploy/lib.sh" "$BIN_DIR/lib.sh"
echo "Deployed $IMAGE_TAG. Data directory was left in place: $DATA_DIR"
