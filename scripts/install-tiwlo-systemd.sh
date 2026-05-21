#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash ./scripts/install-tiwlo-systemd.sh"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPM_BIN="$(command -v npm)"
BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:${BACKEND_PORT}}"

cd "$ROOT"
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
systemctl enable --now tiwlo-backend tiwlo-frontend

echo "Tiwlo systemd services are enabled."
echo "Frontend: http://SERVER_IP:$FRONTEND_PORT"
echo "Backend:  http://SERVER_IP:$BACKEND_PORT/graphql"
