#!/usr/bin/env bash
# Forced command for the deploy key. Anything else is refused.
set -euo pipefail

BIN_DIR="${BIN_DIR:-/opt/convarter/bin}"

case "${SSH_ORIGINAL_COMMAND:-}" in
  deploy)
    exec sudo -n "$BIN_DIR/remote-deploy.sh"
    ;;
  rollback)
    exec sudo -n "$BIN_DIR/rollback.sh"
    ;;
  verify)
    exec sudo -n "$BIN_DIR/verify.sh"
    ;;
  logs)
    exec sudo -n "$BIN_DIR/logs.sh"
    ;;
  *)
    echo "Command not allowed." >&2
    exit 1
    ;;
esac
