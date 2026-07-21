#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  echo "Created .env from .env.example; configure secrets before starting."
fi

(cd "$PROJECT_DIR/backend" && npm ci)
(cd "$PROJECT_DIR/frontend" && npm ci)

echo "Dependencies installed. Database setup and demo seeding remain explicit steps."
