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

open_network_ports() {
  local tcp_ports="25 465 587 993 995 80 443 53"
  local udp_ports="53"
  local port
  if command -v ufw >/dev/null 2>&1; then
    for port in $tcp_ports; do run_sudo ufw allow "${port}/tcp" >/dev/null 2>&1 || true; done
    for port in $udp_ports; do run_sudo ufw allow "${port}/udp" >/dev/null 2>&1 || true; done
  fi
  if command -v firewall-cmd >/dev/null 2>&1; then
    for port in $tcp_ports; do
      run_sudo firewall-cmd --permanent --add-port="${port}/tcp" >/dev/null 2>&1 || true
      run_sudo firewall-cmd --add-port="${port}/tcp" >/dev/null 2>&1 || true
    done
    for port in $udp_ports; do
      run_sudo firewall-cmd --permanent --add-port="${port}/udp" >/dev/null 2>&1 || true
      run_sudo firewall-cmd --add-port="${port}/udp" >/dev/null 2>&1 || true
    done
    run_sudo firewall-cmd --reload >/dev/null 2>&1 || true
  fi
  if command -v iptables >/dev/null 2>&1; then
    for port in $tcp_ports; do
      run_sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT >/dev/null 2>&1 || \
        run_sudo iptables -I INPUT -p tcp --dport "$port" -j ACCEPT >/dev/null 2>&1 || true
    done
    for port in $udp_ports; do
      run_sudo iptables -C INPUT -p udp --dport "$port" -j ACCEPT >/dev/null 2>&1 || \
        run_sudo iptables -I INPUT -p udp --dport "$port" -j ACCEPT >/dev/null 2>&1 || true
    done
  fi
}

verify_listener() {
  local port="$1"
  local label="$2"
  if command -v ss >/dev/null 2>&1; then
    if ss -ltnup 2>/dev/null | grep -Eq "[:.]${port}[[:space:]]"; then
      echo "${label}: listening on ${port}"
    else
      echo "${label}: not listening on ${port}. Check service status and provider firewall."
    fi
  fi
}

detect_public_ipv4() {
  if command -v ip >/dev/null 2>&1; then
    ip -4 route get 1.1.1.1 2>/dev/null | awk '{ for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit } }' && return 0
  fi
  hostname -I 2>/dev/null | awk '{ for (i = 1; i <= NF; i++) if ($i ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) { print $i; exit } }'
}

detect_public_ipv6() {
  if command -v ip >/dev/null 2>&1; then
    ip -6 route get 2606:4700:4700::1111 2>/dev/null | awk '{ for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit } }'
  fi
}

powerdns_local_addresses() {
  local configured="${POWERDNS_LOCAL_ADDRESSES:-${PDNS_LOCAL_ADDRESSES:-}}"
  local ipv4="${POWERDNS_LISTEN_IP:-${PUBLIC_IP:-${SERVER_IP:-}}}"
  local ipv6="${POWERDNS_LISTEN_IPV6:-${PUBLIC_IPV6:-}}"
  if [ -n "$configured" ]; then
    printf '%s' "$configured"
    return 0
  fi
  ipv4="${ipv4:-$(detect_public_ipv4 || true)}"
  ipv6="${ipv6:-$(detect_public_ipv6 || true)}"
  if [ -n "$ipv4" ] && [ -n "$ipv6" ]; then
    printf '%s,%s' "$ipv4" "$ipv6"
  elif [ -n "$ipv4" ]; then
    printf '%s' "$ipv4"
  else
    printf '0.0.0.0'
  fi
}

verify_powerdns_listener() {
  if command -v ss >/dev/null 2>&1; then
    if ss -ltnup 2>/dev/null | awk 'tolower($0) ~ /pdns/ && $0 ~ /[:.]53[[:space:]]/ { found = 1 } END { exit(found ? 0 : 1) }'; then
      echo "PowerDNS authoritative: listening on 53"
    else
      echo "PowerDNS authoritative: not listening on 53. Check pdns status, PostgreSQL backend config, and provider firewall."
    fi
  fi
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
  run_sudo postconf -e "inet_protocols = all" || true
  run_sudo postconf -e "mynetworks = 127.0.0.0/8 [::1]/128" || true
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
  run_sudo postconf -M "submission/inet=submission inet n - n - - smtpd" || true
  run_sudo postconf -P "submission/inet/syslog_name=postfix/submission" || true
  run_sudo postconf -P "submission/inet/smtpd_tls_security_level=encrypt" || true
  run_sudo postconf -P "submission/inet/smtpd_sasl_auth_enable=yes" || true
  run_sudo postconf -P "submission/inet/smtpd_recipient_restrictions=permit_sasl_authenticated,reject" || true
  run_sudo postconf -M "smtps/inet=smtps inet n - n - - smtpd" || true
  run_sudo postconf -P "smtps/inet/syslog_name=postfix/smtps" || true
  run_sudo postconf -P "smtps/inet/smtpd_tls_wrappermode=yes" || true
  run_sudo postconf -P "smtps/inet/smtpd_sasl_auth_enable=yes" || true
  run_sudo postconf -P "smtps/inet/smtpd_recipient_restrictions=permit_sasl_authenticated,reject" || true

  run_sudo mkdir -p /etc/dovecot/conf.d

  write_dovecot_auth_config() {
    cat <<DOVECOT | run_sudo tee /etc/dovecot/conf.d/99-tiwlo-mail-auth.conf >/dev/null
auth_mechanisms = plain login
protocols = imap pop3

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
DOVECOT
  }

  write_dovecot_ssl_config() {
    local mode="$1"
    if [ "$mode" = "modern" ]; then
      cat <<DOVECOTSSL | run_sudo tee /etc/dovecot/conf.d/99-tiwlo-mail-ssl.conf >/dev/null
ssl = required
ssl_server_cert_file = ${cert_file}
ssl_server_key_file = ${key_file}

service imap-login {
  inet_listener imap {
    port = 0
  }

  inet_listener imaps {
    port = 993
    ssl = yes
  }
}

service pop3-login {
  inet_listener pop3 {
    port = 0
  }

  inet_listener pop3s {
    port = 995
    ssl = yes
  }
}
DOVECOTSSL
    else
      cat <<DOVECOTSSL | run_sudo tee /etc/dovecot/conf.d/99-tiwlo-mail-ssl.conf >/dev/null
ssl = required
ssl_cert = <${cert_file}
ssl_key = <${key_file}

service imap-login {
  inet_listener imap {
    port = 0
  }

  inet_listener imaps {
    port = 993
    ssl = yes
  }
}

service pop3-login {
  inet_listener pop3 {
    port = 0
  }

  inet_listener pop3s {
    port = 995
    ssl = yes
  }
}
DOVECOTSSL
    fi
  }

  validate_dovecot_config() {
    if command -v doveconf >/dev/null 2>&1; then
      run_sudo doveconf -n >/dev/null 2>&1
    else
      return 0
    fi
  }

  write_dovecot_auth_config
  write_dovecot_ssl_config modern
  if ! validate_dovecot_config; then
    echo "Dovecot modern SSL settings were not accepted; falling back to legacy Dovecot SSL settings."
    write_dovecot_ssl_config legacy
  fi

  run_sudo systemctl enable --now postfix dovecot >/dev/null 2>&1 || true
  if command -v doveconf >/dev/null 2>&1; then
    run_sudo doveconf -n >/dev/null || echo "Dovecot config validation failed. Run: sudo journalctl -u dovecot -n 80 --no-pager"
  fi
  run_sudo systemctl restart postfix dovecot >/dev/null 2>&1 || true
  verify_listener 465 "Postfix SMTPS"
  verify_listener 587 "Postfix submission"
  verify_listener 993 "Dovecot IMAPS"
  verify_listener 995 "Dovecot POP3S"
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
SMTP_HOST=127.0.0.1
SMTP_PUBLIC_HOST=mail.${mail_domain}
SMTP_TLS_SERVERNAME=mail.${mail_domain}
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
  open_network_ports
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
  open_network_ports
  run_sudo systemctl enable --now certbot.timer >/dev/null 2>&1 || true
}

install_system_powerdns_stack() {
  echo "Preparing Tiwlo PowerDNS packages..."
  local bind_addresses
  bind_addresses="$(powerdns_local_addresses)"
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
local-address=${bind_addresses}
local-port=53
webserver=no
PDNS
    if getent group pdns >/dev/null 2>&1; then
      run_sudo chown root:pdns /etc/powerdns/pdns.d/tiwlo-pgsql.conf >/dev/null 2>&1 || true
      run_sudo chmod 640 /etc/powerdns/pdns.d/tiwlo-pgsql.conf >/dev/null 2>&1 || true
    else
      run_sudo chmod 644 /etc/powerdns/pdns.d/tiwlo-pgsql.conf >/dev/null 2>&1 || true
    fi
  elif command -v dnf >/dev/null 2>&1; then
    run_sudo dnf install -y pdns pdns-backend-postgresql bind-utils >/dev/null 2>&1 || true
  elif command -v yum >/dev/null 2>&1; then
    run_sudo yum install -y pdns pdns-backend-postgresql bind-utils >/dev/null 2>&1 || true
  fi
  open_network_ports
  run_sudo systemctl enable --now pdns >/dev/null 2>&1 || true
  run_sudo systemctl restart pdns >/dev/null 2>&1 || true
  verify_powerdns_listener
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
open_network_ports

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
set_env_value "$ROOT/x/.env" SMTP_HOST "127.0.0.1"
set_env_value "$ROOT/x/.env" SMTP_PUBLIC_HOST "mail.${MAIL_DOMAIN}"
set_env_value "$ROOT/x/.env" SMTP_TLS_SERVERNAME "mail.${MAIL_DOMAIN}"
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
