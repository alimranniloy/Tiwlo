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

clean_domain() {
  printf '%s' "$1" | sed -E 's#^https?://##; s#/.*$##; s#:[0-9]+$##; s#^mail\.##; s#^email\.##; s#^www\.##'
}

random_secret() {
  openssl rand -base64 32 2>/dev/null | tr -dc 'A-Za-z0-9' | head -c 24 || date +%s%N
}

configure_postfix_dovecot() {
  local mail_domain="$1"
  local mail_hostname="$2"
  local cert_file="/etc/letsencrypt/live/${mail_hostname}/fullchain.pem"
  local key_file="/etc/letsencrypt/live/${mail_hostname}/privkey.pem"
  local domain_cert_file="/etc/letsencrypt/live/${mail_domain}/fullchain.pem"
  local domain_key_file="/etc/letsencrypt/live/${mail_domain}/privkey.pem"

  if ! command -v postconf >/dev/null 2>&1; then
    return 0
  fi

  if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
    cert_file="$domain_cert_file"
    key_file="$domain_key_file"
  fi

  if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
    cert_file="/etc/ssl/certs/ssl-cert-snakeoil.pem"
    key_file="/etc/ssl/private/ssl-cert-snakeoil.key"
  fi

  printf '%s\n' "$mail_domain" | run_sudo tee /etc/mailname >/dev/null || true
  run_sudo postconf -e "myhostname = ${mail_hostname}" || true
  run_sudo postconf -e "mydomain = ${mail_domain}" || true
  run_sudo postconf -e "myorigin = /etc/mailname" || true
  run_sudo postconf -e "inet_interfaces = all" || true
  run_sudo postconf -e "home_mailbox = Maildir/" || true
  run_sudo postconf -e "smtpd_tls_cert_file = ${cert_file}" || true
  run_sudo postconf -e "smtpd_tls_key_file = ${key_file}" || true
  run_sudo postconf -e "smtpd_tls_security_level = may" || true
  run_sudo postconf -e "smtp_tls_security_level = may" || true
  run_sudo postconf -e "smtpd_tls_auth_only = yes" || true
  run_sudo postconf -e "smtpd_sasl_type = dovecot" || true
  run_sudo postconf -e "smtpd_sasl_path = private/auth" || true
  run_sudo postconf -e "smtpd_sasl_auth_enable = yes" || true
  run_sudo postconf -e "smtpd_sasl_security_options = noanonymous" || true
  run_sudo postconf -e "smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination" || true
  run_sudo postconf -e "smtpd_relay_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination" || true
  run_sudo postconf -M "submission/inet=submission inet n - y - - smtpd" || true
  run_sudo postconf -P "submission/inet/syslog_name=postfix/submission" || true
  run_sudo postconf -P "submission/inet/smtpd_tls_security_level=encrypt" || true
  run_sudo postconf -P "submission/inet/smtpd_sasl_auth_enable=yes" || true
  run_sudo postconf -P "submission/inet/smtpd_recipient_restrictions=permit_sasl_authenticated,reject" || true
  run_sudo postconf -M "smtps/inet=smtps inet n - y - - smtpd" || true
  run_sudo postconf -P "smtps/inet/syslog_name=postfix/smtps" || true
  run_sudo postconf -P "smtps/inet/smtpd_tls_wrappermode=yes" || true
  run_sudo postconf -P "smtps/inet/smtpd_sasl_auth_enable=yes" || true
  run_sudo postconf -P "smtps/inet/smtpd_recipient_restrictions=permit_sasl_authenticated,reject" || true

  run_sudo mkdir -p /etc/dovecot/conf.d
  cat <<'DOVECOT' | run_sudo tee /etc/dovecot/conf.d/99-tiwlo-mail-auth.conf >/dev/null
disable_plaintext_auth = yes
auth_mechanisms = plain login
auth_username_format = %n

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
DOVECOT

  run_sudo systemctl enable --now postfix dovecot >/dev/null 2>&1 || true
  run_sudo systemctl restart postfix dovecot >/dev/null 2>&1 || true
}

provision_system_mailbox() {
  local mail_domain="$1"
  local smtp_user="$2"
  local smtp_pass="$3"
  local local_user
  local shell_path
  local home_dir

  local_user="$(printf '%s' "${smtp_user%@*}" | tr -cd 'a-zA-Z0-9._-' | cut -c1-31)"
  local_user="${local_user:-noreply}"
  shell_path="/usr/sbin/nologin"
  [ -x "$shell_path" ] || shell_path="/bin/false"
  home_dir="/home/${local_user}"

  if ! id "$local_user" >/dev/null 2>&1; then
    run_sudo useradd -m -d "$home_dir" -s "$shell_path" "$local_user" >/dev/null 2>&1 || true
  fi
  printf '%s:%s\n' "$local_user" "$smtp_pass" | run_sudo chpasswd >/dev/null 2>&1 || true
  run_sudo mkdir -p "$home_dir/Maildir/cur" "$home_dir/Maildir/new" "$home_dir/Maildir/tmp"
  run_sudo chown -R "$local_user:$local_user" "$home_dir/Maildir" >/dev/null 2>&1 || true
  run_sudo chmod -R 700 "$home_dir/Maildir" >/dev/null 2>&1 || true

  run_sudo mkdir -p /etc/tiwlo-mail
  cat <<MAILENV | run_sudo tee /etc/tiwlo-mail/system-smtp.env >/dev/null
SMTP_HOST=mail.${mail_domain}
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=${smtp_user}
SMTP_PASS=${smtp_pass}
MAIL_FROM=${smtp_user}
MAIL_REPLY_TO=support@${mail_domain}
MAILENV
  run_sudo chmod 600 /etc/tiwlo-mail/system-smtp.env >/dev/null 2>&1 || true
}

ensure_mail_tls_certificate() {
  local mail_domain
  local mail_hostname
  local cert_email
  mail_domain="$(clean_domain "${TIWLO_MAIL_DOMAIN:-${APP_DOMAIN:-${TIWLO_DOMAIN:-tiwlo.com}}}")"
  mail_domain="${mail_domain:-tiwlo.com}"
  mail_hostname="${TIWLO_MAIL_HOSTNAME:-mail.${mail_domain}}"
  cert_email="${TIWLO_EMAIL:-admin@${mail_domain}}"

  if ! command -v certbot >/dev/null 2>&1; then
    return 0
  fi

  if [ -f "/etc/letsencrypt/live/${mail_hostname}/fullchain.pem" ]; then
    configure_postfix_dovecot "$mail_domain" "$mail_hostname"
    return 0
  fi

  if getent hosts "$mail_hostname" >/dev/null 2>&1; then
    run_sudo certbot certonly --nginx -d "$mail_hostname" --non-interactive --agree-tos -m "$cert_email" --keep-until-expiring >/dev/null 2>&1 || true
  fi

  configure_postfix_dovecot "$mail_domain" "$mail_hostname"
}

install_system_email_stack() {
  if ! command -v apt-get >/dev/null 2>&1; then
    return 0
  fi
  local mail_domain
  local mail_hostname
  mail_domain="$(clean_domain "${TIWLO_MAIL_DOMAIN:-${APP_DOMAIN:-${TIWLO_DOMAIN:-tiwlo.com}}}")"
  mail_domain="${mail_domain:-tiwlo.com}"
  mail_hostname="${TIWLO_MAIL_HOSTNAME:-mail.${mail_domain}}"
  echo "Preparing Tiwlo Mail packages..."
  echo "postfix postfix/mailname string ${mail_domain}" | run_sudo debconf-set-selections >/dev/null 2>&1 || true
  echo "postfix postfix/main_mailer_type select Internet Site" | run_sudo debconf-set-selections >/dev/null 2>&1 || true
  run_sudo env DEBIAN_FRONTEND=noninteractive apt-get update >/dev/null 2>&1 || true
  run_sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y \
    postfix dovecot-core dovecot-imapd dovecot-pop3d opendkim opendkim-tools \
    rspamd mailutils libsasl2-modules ssl-cert >/dev/null 2>&1 || true
  run_sudo systemctl enable --now postfix dovecot opendkim rspamd >/dev/null 2>&1 || true
  configure_postfix_dovecot "$mail_domain" "$mail_hostname"
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

get_env_value() {
  local file="$1"
  local key="$2"
  [ -f "$file" ] || return 0
  sed -n -E "s/^[[:space:]]*${key}=['\"]?([^'\"]*)['\"]?[[:space:]]*$/\\1/p" "$file" | tail -n 1
}

set_env_value_if_missing() {
  local file="$1"
  local key="$2"
  local value="$3"
  if [ -z "$(get_env_value "$file" "$key")" ]; then
    set_env_value "$file" "$key" "$value"
  fi
}

echo "Updating Tiwlo code..."
git pull --ff-only

install_system_email_stack
install_system_ssl_stack
ensure_mail_tls_certificate
install_system_powerdns_stack

echo "Preparing production GraphQL routing..."
set_env_value "$ROOT/.env" VITE_GRAPHQL_URL "${FRONTEND_GRAPHQL_URL:-/graphql}"
set_env_value "$ROOT/x/.env" POWERDNS_MODE "pgsql"
set_env_value "$ROOT/x/.env" SMTP_PORT "465"
set_env_value "$ROOT/x/.env" SMTP_SECURE "true"
set_env_value "$ROOT/x/.env" SMTP_TLS_REJECT_UNAUTHORIZED "false"
MAIL_DOMAIN="$(clean_domain "${TIWLO_MAIL_DOMAIN:-${APP_DOMAIN:-${TIWLO_DOMAIN:-tiwlo.com}}}")"
MAIL_DOMAIN="${MAIL_DOMAIN:-tiwlo.com}"
SYSTEM_SMTP_USER="$(get_env_value "$ROOT/x/.env" SMTP_USER)"
SYSTEM_SMTP_USER="${SYSTEM_SMTP_USER:-noreply@${MAIL_DOMAIN}}"
SYSTEM_SMTP_PASS="$(get_env_value "$ROOT/x/.env" SMTP_PASS)"
SYSTEM_SMTP_PASS="${SYSTEM_SMTP_PASS:-$(random_secret)}"
set_env_value_if_missing "$ROOT/x/.env" SMTP_HOST "mail.${MAIL_DOMAIN}"
set_env_value "$ROOT/x/.env" SMTP_USER "$SYSTEM_SMTP_USER"
set_env_value "$ROOT/x/.env" SMTP_PASS "$SYSTEM_SMTP_PASS"
set_env_value_if_missing "$ROOT/x/.env" MAIL_FROM "$SYSTEM_SMTP_USER"
set_env_value_if_missing "$ROOT/x/.env" MAIL_FROM_NAME "Tiwlo"
set_env_value_if_missing "$ROOT/x/.env" MAIL_REPLY_TO "support@${MAIL_DOMAIN}"
provision_system_mailbox "$MAIL_DOMAIN" "$SYSTEM_SMTP_USER" "$SYSTEM_SMTP_PASS"
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
