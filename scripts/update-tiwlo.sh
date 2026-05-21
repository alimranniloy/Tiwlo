#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Updating Tiwlo code..."
git pull --ff-only

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
