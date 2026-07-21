#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${CONFIRM_DEMO_SEED:-}" != "yes" ]]; then
  echo "Demo seeding is opt-in. Re-run with CONFIRM_DEMO_SEED=yes." >&2
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo "Missing .env; configure demo passwords and database access first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$PROJECT_DIR/.env"
set +a

(cd "$PROJECT_DIR/backend" && node seeds/seedAll.js)
