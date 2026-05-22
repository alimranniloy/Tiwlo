#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"
  touch "$file"
  if grep -qE "^[[:space:]]*${key}=" "$file"; then
    awk -v key="$key" -v value="$value" '
      BEGIN { line = key "=\"" value "\"" }
      $0 ~ "^[[:space:]]*" key "=" { print line; next }
      { print }
    ' "$file" > "$tmp"
  else
    cp "$file" "$tmp"
    printf '%s="%s"\n' "$key" "$value" >> "$tmp"
  fi
  mv "$tmp" "$file"
}

echo "Updating Tiwlo code..."
git pull --ff-only

echo "Preparing production GraphQL routing..."
set_env_value "$ROOT/.env" VITE_GRAPHQL_URL "${FRONTEND_GRAPHQL_URL:-/graphql}"
if [ -n "${FRONTEND_ORIGIN:-}" ]; then
  set_env_value "$ROOT/.env" APP_URL "$FRONTEND_ORIGIN"
  set_env_value "$ROOT/x/.env" FRONTEND_ORIGIN "$FRONTEND_ORIGIN"
fi
if [ -n "${API_BASE_URL:-}" ]; then
  set_env_value "$ROOT/x/.env" API_BASE_URL "$API_BASE_URL"
fi

echo "Installing dependencies..."
npm install
npm --prefix x install

echo "Preparing Prisma without deleting data..."
npm --prefix x run db:generate
npm --prefix x run db:push

echo "Building frontend..."
npm run build

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart tiwlo-backend 2>/dev/null || true
  sudo systemctl restart tiwlo-frontend 2>/dev/null || true
fi

echo "Tiwlo update complete. Existing PostgreSQL data was preserved."
