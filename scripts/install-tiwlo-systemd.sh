#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash ./scripts/install-tiwlo-systemd.sh"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPM_BIN="$(command -v npm || true)"
if [ -z "$NPM_BIN" ]; then
  NPM_BIN="$(find "$ROOT/.tools/node" -path '*/bin/npm' -type f 2>/dev/null | sort | tail -n 1 || true)"
fi
if [ -z "$NPM_BIN" ]; then
  echo "npm was not found. Run ./scripts/start-tiwlo.sh first or install Node.js/npm." >&2
  exit 1
fi
export PATH="$(dirname "$NPM_BIN"):$PATH"
BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:${BACKEND_PORT}}"
FRONTEND_GRAPHQL_URL="${FRONTEND_GRAPHQL_URL:-/graphql}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-${APP_URL:-http://localhost:${FRONTEND_PORT}}}"
API_BASE_URL="${API_BASE_URL:-${FRONTEND_ORIGIN}}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/tiwlo?schema=public}"

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

set_env_value_if_missing() {
  local file="$1"
  local key="$2"
  local value="$3"
  touch "$file"
  if ! grep -qE "^[[:space:]]*${key}=" "$file"; then
    printf '%s="%s"\n' "$key" "$value" >> "$file"
  fi
}

cd "$ROOT"
set_env_value "$ROOT/.env" VITE_GRAPHQL_URL "$FRONTEND_GRAPHQL_URL"
set_env_value "$ROOT/.env" APP_URL "$FRONTEND_ORIGIN"
set_env_value "$ROOT/x/.env" PORT "$BACKEND_PORT"
set_env_value "$ROOT/x/.env" FRONTEND_ORIGIN "$FRONTEND_ORIGIN"
set_env_value "$ROOT/x/.env" API_BASE_URL "$API_BASE_URL"
set_env_value "$ROOT/x/.env" CORS_ORIGINS "$FRONTEND_ORIGIN"
set_env_value_if_missing "$ROOT/x/.env" DATABASE_URL "$DATABASE_URL"
set_env_value_if_missing "$ROOT/x/.env" JWT_SECRET "$(openssl rand -hex 32 2>/dev/null || date +%s%N)"
npm install
npm --prefix x install
npm --prefix x run db:generate
npm --prefix x run db:push
npm run build

cat >/etc/systemd/system/tiwlo-backend.service <<SERVICE
[Unit]
Description=Tiwlo GraphQL Backend
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT/x
EnvironmentFile=$ROOT/x/.env
Environment=NODE_ENV=production
Environment=PORT=$BACKEND_PORT
ExecStart=$NPM_BIN run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat >/etc/systemd/system/tiwlo-frontend.service <<SERVICE
[Unit]
Description=Tiwlo Frontend
After=network-online.target tiwlo-backend.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT
EnvironmentFile=$ROOT/.env
Environment=NODE_ENV=production
Environment=FRONTEND_PORT=$FRONTEND_PORT
Environment=BACKEND_URL=$BACKEND_URL
ExecStart=$NPM_BIN run start -- --port $FRONTEND_PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable tiwlo-backend tiwlo-frontend
systemctl restart tiwlo-backend tiwlo-frontend

echo "Tiwlo systemd services are enabled."
echo "Frontend: http://SERVER_IP:$FRONTEND_PORT"
echo "Backend:  http://SERVER_IP:$BACKEND_PORT/graphql"
