#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo "Missing .env; copy .env.example and configure PostgreSQL first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$PROJECT_DIR/.env"
set +a

db_host="${DB_HOST:-localhost}"
db_port="${DB_PORT:-5432}"
db_name="${DB_NAME:-ai_productivity_hub}"
db_user="${DB_USER:-postgres}"

if [[ ! "$db_name" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "DB_NAME may contain only letters, numbers, and underscores." >&2
  exit 1
fi

export PGPASSWORD="${DB_PASSWORD:-}"
if ! psql -h "$db_host" -p "$db_port" -U "$db_user" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '$db_name'" | grep -q 1; then
  createdb -h "$db_host" -p "$db_port" -U "$db_user" "$db_name"
fi

psql -v ON_ERROR_STOP=1 -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" \
  -f "$PROJECT_DIR/backend/models/schema.sql"

for migration in "$PROJECT_DIR"/backend/migrations/*.sql; do
  [[ -e "$migration" ]] || continue
  psql -v ON_ERROR_STOP=1 -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -f "$migration"
done

echo "Database schema applied without dropping existing data."
