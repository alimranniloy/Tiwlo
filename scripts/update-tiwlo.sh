#!/usr/bin/env bash
set -euo pipefail

if [ -n "${TIWLO_INSTALL_DIR:-}" ]; then
  ROOT="$TIWLO_INSTALL_DIR"
elif [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
elif [ -d "/var/www/Tiwlo/.git" ]; then
  ROOT="/var/www/Tiwlo"
else
  ROOT="$PWD"
fi

if [ ! -d "$ROOT/.git" ]; then
  echo "Could not find a Tiwlo git checkout at $ROOT."
  echo "Run from the Tiwlo directory or set TIWLO_INSTALL_DIR=/path/to/Tiwlo."
  exit 1
fi

cd "$ROOT"

run_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    return 1
  fi
}

install_system_email_stack() {
  if ! command -v apt-get >/dev/null 2>&1; then
    return 0
  fi
  echo "Preparing Tiwlo Mail packages..."
  echo "postfix postfix/mailname string ${TIWLO_MAIL_DOMAIN:-tiwlo.local}" | run_sudo debconf-set-selections >/dev/null 2>&1 || true
  echo "postfix postfix/main_mailer_type select Internet Site" | run_sudo debconf-set-selections >/dev/null 2>&1 || true
  run_sudo env DEBIAN_FRONTEND=noninteractive apt-get update >/dev/null 2>&1 || true
  run_sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y \
    postfix dovecot-core dovecot-imapd dovecot-pop3d opendkim opendkim-tools \
    rspamd mailutils libsasl2-modules >/dev/null 2>&1 || true
  run_sudo systemctl enable --now postfix dovecot opendkim rspamd >/dev/null 2>&1 || true
  run_sudo ufw allow 25/tcp >/dev/null 2>&1 || true
  run_sudo ufw allow 110/tcp >/dev/null 2>&1 || true
  run_sudo ufw allow 143/tcp >/dev/null 2>&1 || true
  run_sudo ufw allow 465/tcp >/dev/null 2>&1 || true
  run_sudo ufw allow 587/tcp >/dev/null 2>&1 || true
  run_sudo ufw allow 993/tcp >/dev/null 2>&1 || true
  run_sudo ufw allow 995/tcp >/dev/null 2>&1 || true
}

install_system_ssl_stack() {
  echo "Preparing Tiwlo SSL packages..."
  if command -v apt-get >/dev/null 2>&1; then
    run_sudo env DEBIAN_FRONTEND=noninteractive apt-get update >/dev/null 2>&1 || true
    run_sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y \
      certbot python3-certbot-nginx ca-certificates openssl cron >/dev/null 2>&1 || true
  elif command -v dnf >/dev/null 2>&1; then
    run_sudo dnf install -y certbot python3-certbot-nginx ca-certificates openssl cronie >/dev/null 2>&1 || true
  elif command -v yum >/dev/null 2>&1; then
    run_sudo yum install -y certbot python3-certbot-nginx ca-certificates openssl cronie >/dev/null 2>&1 || true
  fi
  run_sudo ufw allow 80/tcp >/dev/null 2>&1 || true
  run_sudo ufw allow 443/tcp >/dev/null 2>&1 || true
  run_sudo systemctl enable --now certbot.timer >/dev/null 2>&1 || true
}

install_system_powerdns_stack() {
  echo "Preparing Tiwlo PowerDNS packages..."
  if command -v apt-get >/dev/null 2>&1; then
    run_sudo env DEBIAN_FRONTEND=noninteractive apt-get update >/dev/null 2>&1 || true
    run_sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y \
      pdns-server pdns-backend-pgsql dnsutils >/dev/null 2>&1 || true
    run_sudo mkdir -p /etc/powerdns/pdns.d
    cat <<PDNS | run_sudo tee /etc/powerdns/pdns.d/tiwlo-pgsql.conf >/dev/null
launch=gpgsql
gpgsql-host=127.0.0.1
gpgsql-port=5432
gpgsql-dbname=tiwlo
gpgsql-user=postgres
gpgsql-password=postgres
gpgsql-dnssec=yes
local-address=0.0.0.0,::
local-port=53
webserver=no
PDNS
    run_sudo chmod 640 /etc/powerdns/pdns.d/tiwlo-pgsql.conf >/dev/null 2>&1 || true
  elif command -v dnf >/dev/null 2>&1; then
    run_sudo dnf install -y pdns pdns-backend-postgresql bind-utils >/dev/null 2>&1 || true
  elif command -v yum >/dev/null 2>&1; then
    run_sudo yum install -y pdns pdns-backend-postgresql bind-utils >/dev/null 2>&1 || true
  fi
  run_sudo ufw allow 53/tcp >/dev/null 2>&1 || true
  run_sudo ufw allow 53/udp >/dev/null 2>&1 || true
  run_sudo systemctl enable --now pdns >/dev/null 2>&1 || true
}

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

install_system_email_stack
install_system_ssl_stack
install_system_powerdns_stack

echo "Preparing production GraphQL routing..."
set_env_value "$ROOT/.env" VITE_GRAPHQL_URL "${FRONTEND_GRAPHQL_URL:-/graphql}"
set_env_value "$ROOT/x/.env" POWERDNS_MODE "pgsql"
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
if [ -d "$ROOT/src/tPanel" ]; then
  npm --prefix src/tPanel install
  npm --prefix src/tPanel run build
fi

if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart tiwlo-backend 2>/dev/null || true
  sudo systemctl restart tiwlo-frontend 2>/dev/null || true
fi

echo "Tiwlo update complete. Existing PostgreSQL data was preserved."
