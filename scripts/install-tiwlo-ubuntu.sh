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

ensure_system_postgres_database() {
  step "Preparing system PostgreSQL"
  systemctl enable --now postgresql >/dev/null 2>&1 || true
  for _ in $(seq 1 30); do
    if pg_isready -h 127.0.0.1 -p 5432 -U postgres >/dev/null 2>&1 || pg_isready -p 5432 >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  sudo -u postgres psql -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';" >/dev/null
  if ! sudo -u postgres psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tiwlo'" | grep -q 1; then
    sudo -u postgres createdb tiwlo
  fi
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
echo "postfix postfix/mailname string ${DOMAIN:-tiwlo.local}" | debconf-set-selections || true
echo "postfix postfix/main_mailer_type select Internet Site" | debconf-set-selections || true
apt-get update
apt-get install -y \
  sudo git curl wget ca-certificates xz-utils build-essential python3 make g++ \
  postgresql postgresql-contrib nginx ufw certbot python3-certbot-nginx \
  postfix dovecot-imapd dovecot-pop3d roundcube roundcube-core roundcube-pgsql \
  opendkim opendkim-tools mailutils
systemctl enable --now postgresql nginx postfix dovecot opendkim >/dev/null 2>&1 || true
ensure_system_postgres_database

step "Configuring system email services"
MAIL_DOMAIN="${DOMAIN:-tiwlo.local}"
MAIL_HOSTNAME="mail.${MAIL_DOMAIN}"
postconf -e "myhostname = ${MAIL_HOSTNAME}" || true
postconf -e "myorigin = /etc/mailname" || true
postconf -e "inet_interfaces = all" || true
postconf -e "home_mailbox = Maildir/" || true
postconf -e "smtpd_tls_security_level = may" || true
postconf -e "smtp_tls_security_level = may" || true
printf '%s\n' "${MAIL_DOMAIN}" >/etc/mailname
systemctl restart postfix dovecot >/dev/null 2>&1 || true

step "Preparing Tiwlo source at ${INSTALL_DIR}"
mkdir -p "$(dirname "$INSTALL_DIR")"
if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" fetch origin "$BRANCH"
  if [ -n "$(git -C "$INSTALL_DIR" status --porcelain)" ]; then
    step "Saving local server changes before update"
    git -C "$INSTALL_DIR" stash push -u -m "tiwlo-installer-autostash-$(date +%Y%m%d%H%M%S)"
  fi
  if ! git -C "$INSTALL_DIR" checkout -B "$BRANCH" "origin/$BRANCH"; then
    step "Checkout blocked; saving local changes and retrying"
    git -C "$INSTALL_DIR" stash push -u -m "tiwlo-installer-autostash-$(date +%Y%m%d%H%M%S)" || true
    git -C "$INSTALL_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
  fi
  git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
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
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/tiwlo?schema=public"
export BACKEND_PORT
export FRONTEND_PORT
mkdir -p x
{
  echo "SMTP_HOST=\"${MAIL_HOSTNAME}\""
  echo "SMTP_PORT=\"465\""
  echo "SMTP_SECURE=\"true\""
  echo "SMTP_USER=\"noreply@${MAIL_DOMAIN}\""
  echo "MAIL_FROM=\"noreply@${MAIL_DOMAIN}\""
  echo "MAIL_FROM_NAME=\"Tiwlo\""
  echo "MAIL_REPLY_TO=\"${EMAIL:-support@${MAIL_DOMAIN}}\""
} >> x/.env
bash ./scripts/start-tiwlo.sh

step "Installing reboot-safe systemd services"
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}" \
FRONTEND_GRAPHQL_URL="/graphql" \
FRONTEND_ORIGIN="$PUBLIC_ORIGIN" \
API_BASE_URL="$PUBLIC_ORIGIN" \
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/tiwlo?schema=public" \
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
ufw allow 25/tcp >/dev/null 2>&1 || true
ufw allow 465/tcp >/dev/null 2>&1 || true
ufw allow 587/tcp >/dev/null 2>&1 || true
ufw allow 993/tcp >/dev/null 2>&1 || true
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
echo "Webmail: ${PUBLIC_ORIGIN}/webmail (Roundcube package installed; point mail.${MAIL_DOMAIN} DNS to this server)"
echo "Backend: http://127.0.0.1:${BACKEND_PORT}/graphql"
echo "Auto-start: systemd services tiwlo-backend and tiwlo-frontend are enabled."
