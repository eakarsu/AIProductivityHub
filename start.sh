#!/usr/bin/env bash
set -euo pipefail

LAUNCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$LAUNCH_DIR"
if [[ "${NODE_ENV:-}" == test && -n "${RUNTIME_PROJECT_SOURCE:-}" && -d "$RUNTIME_PROJECT_SOURCE" ]]; then
  PROJECT_DIR="$(cd "$RUNTIME_PROJECT_SOURCE" && pwd)"
fi
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

if [[ ! -f "$LAUNCH_DIR/.env" ]]; then
  echo "Missing $LAUNCH_DIR/.env. Copy .env.example and configure it first." >&2
  exit 1
fi

if [[ ! -d "$BACKEND_DIR/node_modules" || ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Dependencies are not installed. Run scripts/bootstrap.sh explicitly." >&2
  exit 1
fi

load_env_file() {
  local file="$1" line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    case "$line" in ''|'#'*) continue ;; esac
    line="${line#export }"
    key="${line%%=*}"
    value="${line#*=}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ "$value" == \"*\" && "$value" == *\" ]] || [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi
    if [[ -z "${!key+x}" ]]; then printf -v "$key" '%s' "$value"; export "$key"; fi
  done < "$file"
}
load_env_file "$LAUNCH_DIR/.env"

PORT="${PORT:-${BACKEND_PORT:-3001}}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"

if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" >/dev/null 2>&1; then
    echo "PostgreSQL is unavailable. Start it and run scripts/database-setup.sh if needed." >&2
    exit 1
  fi
fi

backend_pid=""
frontend_pid=""
cleanup() {
  [[ -n "$backend_pid" ]] && kill "$backend_pid" 2>/dev/null || true
  [[ -n "$frontend_pid" ]] && kill "$frontend_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$BACKEND_DIR" && START_HTTP_SERVER=true PORT="$PORT" FRONTEND_URL="${FRONTEND_URL:-http://$FRONTEND_HOST:$FRONTEND_PORT}" npm start) &
backend_pid=$!
(cd "$FRONTEND_DIR" && HOST="$FRONTEND_HOST" BROWSER=none PORT="$FRONTEND_PORT" REACT_APP_API_URL="${REACT_APP_API_URL:-http://$BACKEND_HOST:$PORT/api}" npm start) &
frontend_pid=$!

echo "Frontend: http://$FRONTEND_HOST:$FRONTEND_PORT"
echo "Backend:  http://$BACKEND_HOST:$PORT"
echo "Only processes started by this script will be stopped."

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done
