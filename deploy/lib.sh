# Shared paths for the server scripts. Source this file; do not execute it.
# These scripts never delete DATA_DIR, .env, or certificate files.

: "${APP_DIR:=/opt/convarter/app}"
: "${DATA_DIR:=/opt/convarter/data}"
: "${BIN_DIR:=/opt/convarter/bin}"

env_value() {
  key="$1"
  file="$APP_DIR/.env"
  if [ ! -f "$file" ]; then
    return 0
  fi
  awk -F= -v key="$key" '$1 == key { value = substr($0, index($0, "=") + 1) } END { print value }' "$file"
}

load_layout() {
  if [ -f "$APP_DIR/.env" ]; then
    from_file="$(env_value DATA_DIR)"
    if [ -n "$from_file" ]; then
      DATA_DIR="$from_file"
    fi
    from_file="$(env_value DOMAIN)"
    if [ -n "$from_file" ]; then
      DOMAIN="$from_file"
    fi
    from_file="$(env_value HTTP_PORT)"
    if [ -n "$from_file" ]; then
      HTTP_PORT="$from_file"
    fi
  fi
  : "${DOMAIN:=_}"
  : "${HTTP_PORT:=8080}"
  case "$DATA_DIR" in
    "$APP_DIR"|"$APP_DIR"/*)
      echo "DATA_DIR must stay outside the git checkout ($APP_DIR)." >&2
      exit 1
      ;;
  esac
  mkdir -p "$DATA_DIR/storage" "$DATA_DIR/certbot" "$DATA_DIR/certbot-www" "$DATA_DIR/meta"
}

compose() {
  docker compose --project-directory "$APP_DIR" -f "$APP_DIR/docker-compose.yml" "$@"
}

require_env_file() {
  if [ ! -f "$APP_DIR/.env" ]; then
    echo "Missing $APP_DIR/.env. Copy .env.example and edit it on the server. Deploy will not create or replace it." >&2
    exit 1
  fi
}
