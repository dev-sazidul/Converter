#!/usr/bin/env bash
# Return the running code to the release recorded before the last deploy.
# The data directory, .env, and certificates are left in place.
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

previous="$DATA_DIR/meta/previous-release.txt"
if [ ! -f "$previous" ]; then
  echo "No previous release is recorded in $previous." >&2
  exit 1
fi
sha="$(tr -d '[:space:]' < "$previous")"
if ! printf '%s' "$sha" | grep -Eq '^[0-9a-f]{40}$'; then
  echo "Previous release id is not a commit." >&2
  exit 1
fi
git -C "$APP_DIR" cat-file -e "${sha}^{commit}"
git -C "$APP_DIR" checkout --detach "$sha"
printf '%s\n' "$sha" > "$DATA_DIR/meta/current-release.txt"

export IMAGE_TAG="${sha:0:12}"
cd "$APP_DIR"
compose up -d --build --remove-orphans
compose ps
"$SCRIPT_DIR/verify.sh"
echo "Rolled back to $sha. Uploads in $DATA_DIR/storage were not removed."
