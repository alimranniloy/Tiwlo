#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: curl -fsSL https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/install-tiwlo-ubuntu.sh | sudo env TIWLO_DOMAIN=example.com TIWLO_EMAIL=admin@example.com bash"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

DOMAIN="${TIWLO_DOMAIN:-${1:-}}"
EMAIL="${TIWLO_EMAIL:-${2:-}}"
REPO_URL="${TIWLO_REPO_URL:-https://github.com/alimranniloy/Tiwlo.git}"
BRANCH="${TIWLO_BRANCH:-main}"
INSTALL_DIR="${TIWLO_INSTALL_DIR:-/var/www/Tiwlo}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

step() {
  echo
  echo "==> $*"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

server_ip() {
  if have curl; then
    curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null && return 0
  fi
  hostname -I 2>/dev/null | awk '{print $1}'
}

is_ip_address() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || [[ "$1" == *:* ]]
}

PUBLIC_IP="$(server_ip || true)"
if [ -n "$DOMAIN" ]; then
  PUBLIC_ORIGIN="https://${DOMAIN}"
else
  PUBLIC_ORIGIN="http://${PUBLIC_IP:-SERVER_IP}"
fi

if [ -z "$EMAIL" ] && [ -n "$DOMAIN" ]; then
  EMAIL="admin@${DOMAIN}"
fi

step "Installing Ubuntu packages"
apt-get update
apt-get install -y \
  sudo git curl wget ca-certificates xz-utils build-essential python3 make g++ \
  postgresql postgresql-contrib nginx ufw certbot python3-certbot-nginx
systemctl enable --now postgresql nginx >/dev/null 2>&1 || true

step "Preparing Tiwlo source at ${INSTALL_DIR}"
mkdir -p "$(dirname "$INSTALL_DIR")"
if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" fetch origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
elif [ -e "$INSTALL_DIR" ]; then
  echo "$INSTALL_DIR already exists but is not a git checkout. Move it away or set TIWLO_INSTALL_DIR to a new path."
  exit 1
else
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
chmod +x ./scripts/*.sh

step "Installing and building Tiwlo"
export FRONTEND_GRAPHQL_URL="/graphql"
export FRONTEND_ORIGIN="$PUBLIC_ORIGIN"
export API_BASE_URL="$PUBLIC_ORIGIN"
export BACKEND_PORT
export FRONTEND_PORT
bash ./scripts/start-tiwlo.sh

step "Installing reboot-safe systemd services"
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}" \
FRONTEND_GRAPHQL_URL="/graphql" \
FRONTEND_ORIGIN="$PUBLIC_ORIGIN" \
API_BASE_URL="$PUBLIC_ORIGIN" \
BACKEND_PORT="$BACKEND_PORT" \
FRONTEND_PORT="$FRONTEND_PORT" \
bash ./scripts/install-tiwlo-systemd.sh

step "Configuring Nginx reverse proxy"
NGINX_SITE="/etc/nginx/sites-available/tiwlo"
SERVER_NAME="_"
if [ -n "$DOMAIN" ]; then
  SERVER_NAME="${DOMAIN} www.${DOMAIN}"
fi

cat >"$NGINX_SITE" <<NGINX
server {
    listen 80;
    server_name ${SERVER_NAME};
    client_max_body_size 100m;

    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;

    location /graphql {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
    }

    location /admin {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
    }

    location /health {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
    }

    location /payments {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
    }

    location /webhooks {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
    }

    location /automation {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
    }

    location /ai {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_buffering off;
    }

    location /tpanel/install.sh {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
    }

    location /tpanel/api/ {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
    }

    location / {
        proxy_pass http://127.0.0.1:${FRONTEND_PORT};
        proxy_http_version 1.1;
    }
}
NGINX

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/tiwlo
nginx -t
systemctl reload nginx

step "Configuring firewall"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

if [ -n "$DOMAIN" ] && ! is_ip_address "$DOMAIN"; then
  step "Requesting SSL certificate for ${DOMAIN}"
  CERTBOT_DOMAINS=(-d "$DOMAIN")
  if getent hosts "www.${DOMAIN}" >/dev/null 2>&1; then
    CERTBOT_DOMAINS+=(-d "www.${DOMAIN}")
  fi
  if certbot --nginx "${CERTBOT_DOMAINS[@]}" --non-interactive --agree-tos -m "$EMAIL" --redirect; then
    systemctl reload nginx
  else
    echo "SSL setup failed. Check that DNS A record for ${DOMAIN} points to ${PUBLIC_IP:-this server}, then run:"
    echo "sudo certbot --nginx -d ${DOMAIN}"
  fi
fi

step "Verifying local services"
curl -fsS "http://127.0.0.1:${BACKEND_PORT}/health" >/dev/null
curl -fsS "http://127.0.0.1:${FRONTEND_PORT}" >/dev/null
systemctl is-enabled tiwlo-backend tiwlo-frontend >/dev/null

echo
echo "Tiwlo install complete."
echo "Website: ${PUBLIC_ORIGIN}"
echo "Backend: http://127.0.0.1:${BACKEND_PORT}/graphql"
echo "Auto-start: systemd services tiwlo-backend and tiwlo-frontend are enabled."
