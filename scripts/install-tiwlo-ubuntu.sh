#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: curl -fsSL https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/install-tiwlo-ubuntu.sh | sudo env TIWLO_DOMAIN=example.com TIWLO_EMAIL=admin@example.com bash"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

clean_domain() {
  printf '%s' "$1" | sed -E 's#^https?://##; s#/.*$##; s#:[0-9]+$##; s#^((mail|email|tmail|www)\.)+##'
}

DOMAIN="$(clean_domain "${TIWLO_DOMAIN:-${1:-}}")"
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

open_network_ports() {
  local tcp_ports="25 465 587 993 995 80 443 53"
  local udp_ports="53"
  local port
  if have ufw; then
    for port in $tcp_ports; do ufw allow "${port}/tcp" >/dev/null 2>&1 || true; done
    for port in $udp_ports; do ufw allow "${port}/udp" >/dev/null 2>&1 || true; done
  fi
  if have firewall-cmd; then
    for port in $tcp_ports; do
      firewall-cmd --permanent --add-port="${port}/tcp" >/dev/null 2>&1 || true
      firewall-cmd --add-port="${port}/tcp" >/dev/null 2>&1 || true
    done
    for port in $udp_ports; do
      firewall-cmd --permanent --add-port="${port}/udp" >/dev/null 2>&1 || true
      firewall-cmd --add-port="${port}/udp" >/dev/null 2>&1 || true
    done
    firewall-cmd --reload >/dev/null 2>&1 || true
  fi
  if have iptables; then
    for port in $tcp_ports; do
      iptables -C INPUT -p tcp --dport "$port" -j ACCEPT >/dev/null 2>&1 || \
        iptables -I INPUT -p tcp --dport "$port" -j ACCEPT >/dev/null 2>&1 || true
    done
    for port in $udp_ports; do
      iptables -C INPUT -p udp --dport "$port" -j ACCEPT >/dev/null 2>&1 || \
        iptables -I INPUT -p udp --dport "$port" -j ACCEPT >/dev/null 2>&1 || true
    done
  fi
}

verify_listener() {
  local port="$1"
  local label="$2"
  if have ss; then
    if ss -ltnup 2>/dev/null | grep -Eq "[:.]${port}[[:space:]]"; then
      echo "${label}: listening on ${port}"
    else
      echo "${label}: not listening on ${port}. Check service status and provider firewall."
    fi
  fi
}

configure_postfix_delivery_safety() {
  if ! have postconf; then
    return 0
  fi

  postconf -e "milter_default_action = accept" || true
  postconf -e "milter_protocol = 6" || true
  postconf -e "milter_connect_timeout = 3s" || true
  postconf -e "milter_command_timeout = 10s" || true
  postconf -e "milter_content_timeout = 30s" || true
  postconf -e "smtpd_milters =" || true
  postconf -e "non_smtpd_milters =" || true
  postconf -e "content_filter =" || true
  postconf -e "smtpd_proxy_filter =" || true
  postconf -e "smtpd_client_restrictions = permit_mynetworks,permit_sasl_authenticated" || true
  postconf -e "smtpd_helo_restrictions =" || true
  postconf -e "smtpd_sender_restrictions =" || true
  postconf -e "smtpd_data_restrictions =" || true
  postconf -e "smtpd_end_of_data_restrictions =" || true
  postconf -e "smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination" || true
  postconf -e "smtpd_relay_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination" || true
  postconf -P "submission/inet/smtpd_client_restrictions=permit_sasl_authenticated" || true
  postconf -P "submission/inet/smtpd_sender_restrictions=" || true
  postconf -P "submission/inet/smtpd_data_restrictions=" || true
  postconf -P "submission/inet/smtpd_end_of_data_restrictions=" || true
  postconf -P "submission/inet/smtpd_milters=" || true
  postconf -P "submission/inet/content_filter=" || true
  postconf -P "submission/inet/smtpd_relay_restrictions=permit_sasl_authenticated,reject" || true
  postconf -P "smtps/inet/smtpd_client_restrictions=permit_sasl_authenticated" || true
  postconf -P "smtps/inet/smtpd_sender_restrictions=" || true
  postconf -P "smtps/inet/smtpd_data_restrictions=" || true
  postconf -P "smtps/inet/smtpd_end_of_data_restrictions=" || true
  postconf -P "smtps/inet/smtpd_milters=" || true
  postconf -P "smtps/inet/content_filter=" || true
  postconf -P "smtps/inet/smtpd_relay_restrictions=permit_sasl_authenticated,reject" || true
}

detect_public_ipv4() {
  if have ip; then
    ip -4 route get 1.1.1.1 2>/dev/null | awk '{ for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit } }' && return 0
  fi
  hostname -I 2>/dev/null | awk '{ for (i = 1; i <= NF; i++) if ($i ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) { print $i; exit } }'
}

detect_public_ipv6() {
  if have ip; then
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
  if have ss; then
    if ss -ltnup 2>/dev/null | awk 'tolower($0) ~ /pdns/ && $0 ~ /[:.]53[[:space:]]/ { found = 1 } END { exit(found ? 0 : 1) }'; then
      echo "PowerDNS authoritative: listening on 53"
    else
      echo "PowerDNS authoritative: not listening on 53. Check pdns status, PostgreSQL backend config, and provider firewall."
    fi
  fi
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

configure_powerdns() {
  step "Configuring PowerDNS authoritative service"
  local bind_addresses
  bind_addresses="$(powerdns_local_addresses)"
  mkdir -p /etc/powerdns/pdns.d
  cat >/etc/powerdns/pdns.d/tiwlo-pgsql.conf <<PDNS
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
    chown root:pdns /etc/powerdns/pdns.d/tiwlo-pgsql.conf || true
    chmod 640 /etc/powerdns/pdns.d/tiwlo-pgsql.conf || true
  else
    chmod 644 /etc/powerdns/pdns.d/tiwlo-pgsql.conf || true
  fi
  systemctl enable --now pdns >/dev/null 2>&1 || true
  systemctl restart pdns >/dev/null 2>&1 || true
  verify_powerdns_listener
}

configure_system_email_services() {
  step "Configuring system email services"
  MAIL_DOMAIN="${DOMAIN:-tiwlo.local}"
  MAIL_HOSTNAME="mail.${MAIL_DOMAIN}"
  CERT_FILE="/etc/letsencrypt/live/${MAIL_HOSTNAME}/fullchain.pem"
  KEY_FILE="/etc/letsencrypt/live/${MAIL_HOSTNAME}/privkey.pem"
  DOMAIN_CERT_FILE="/etc/letsencrypt/live/${MAIL_DOMAIN}/fullchain.pem"
  DOMAIN_KEY_FILE="/etc/letsencrypt/live/${MAIL_DOMAIN}/privkey.pem"

  if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    CERT_FILE="$DOMAIN_CERT_FILE"
    KEY_FILE="$DOMAIN_KEY_FILE"
  fi

  if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    CERT_FILE="/etc/ssl/certs/ssl-cert-snakeoil.pem"
    KEY_FILE="/etc/ssl/private/ssl-cert-snakeoil.key"
  fi

  printf '%s\n' "${MAIL_DOMAIN}" >/etc/mailname
  postconf -e "myhostname = ${MAIL_HOSTNAME}" || true
  postconf -e "mydomain = ${MAIL_DOMAIN}" || true
  postconf -e "myorigin = /etc/mailname" || true
  postconf -e "inet_interfaces = all" || true
  postconf -e "inet_protocols = all" || true
  postconf -e "mynetworks = 127.0.0.0/8 [::1]/128" || true
  postconf -e "home_mailbox = Maildir/" || true
  postconf -e "smtpd_tls_cert_file = ${CERT_FILE}" || true
  postconf -e "smtpd_tls_key_file = ${KEY_FILE}" || true
  postconf -e "smtpd_tls_security_level = may" || true
  postconf -e "smtp_tls_security_level = may" || true
  postconf -e "smtpd_tls_auth_only = yes" || true
  postconf -e "smtpd_sasl_type = dovecot" || true
  postconf -e "smtpd_sasl_path = private/auth" || true
  postconf -e "smtpd_sasl_auth_enable = yes" || true
  postconf -e "smtpd_sasl_security_options = noanonymous" || true
  postconf -e "smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination" || true
  postconf -e "smtpd_relay_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination" || true
  configure_postfix_delivery_safety
  postconf -M "submission/inet=submission inet n - n - - smtpd" || true
  postconf -P "submission/inet/syslog_name=postfix/submission" || true
  postconf -P "submission/inet/smtpd_tls_security_level=encrypt" || true
  postconf -P "submission/inet/smtpd_sasl_auth_enable=yes" || true
  postconf -P "submission/inet/smtpd_recipient_restrictions=permit_sasl_authenticated,reject" || true
  postconf -M "smtps/inet=smtps inet n - n - - smtpd" || true
  postconf -P "smtps/inet/syslog_name=postfix/smtps" || true
  postconf -P "smtps/inet/smtpd_tls_wrappermode=yes" || true
  postconf -P "smtps/inet/smtpd_sasl_auth_enable=yes" || true
  postconf -P "smtps/inet/smtpd_recipient_restrictions=permit_sasl_authenticated,reject" || true
  configure_postfix_delivery_safety

  mkdir -p /etc/dovecot/conf.d

  write_dovecot_auth_config() {
    local mode="${1:-modern}"
    local username_format="auth_username_format = %{user | username}"
    if [ "$mode" = "legacy" ]; then
      username_format="auth_username_format = %n"
    elif [ "$mode" = "minimal" ]; then
      username_format=""
    fi
    cat >/etc/dovecot/conf.d/99-tiwlo-mail-auth.conf <<DOVECOT
auth_mechanisms = plain login
${username_format}
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
      cat >/etc/dovecot/conf.d/99-tiwlo-mail-ssl.conf <<DOVECOTSSL
ssl = required
ssl_server_cert_file = ${CERT_FILE}
ssl_server_key_file = ${KEY_FILE}

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
      cat >/etc/dovecot/conf.d/99-tiwlo-mail-ssl.conf <<DOVECOTSSL
ssl = required
ssl_cert = <${CERT_FILE}
ssl_key = <${KEY_FILE}

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
    if have doveconf; then
      doveconf -n >/dev/null 2>&1
    else
      return 0
    fi
  }

  write_dovecot_auth_config modern
  write_dovecot_ssl_config modern
  if ! validate_dovecot_config; then
    echo "Dovecot modern SSL settings were not accepted; falling back to legacy Dovecot SSL settings."
    write_dovecot_ssl_config legacy
  fi
  if ! validate_dovecot_config; then
    echo "Dovecot modern auth username format was not accepted; falling back to legacy Dovecot username format."
    write_dovecot_auth_config legacy
  fi
  if ! validate_dovecot_config; then
    echo "Dovecot username format override was not accepted; using minimal auth settings."
    write_dovecot_auth_config minimal
  fi

  systemctl enable --now postfix dovecot >/dev/null 2>&1 || true
  if have doveconf; then
    doveconf -n >/dev/null || echo "Dovecot config validation failed. Run: sudo journalctl -u dovecot -n 80 --no-pager"
  fi
  systemctl restart postfix dovecot >/dev/null 2>&1 || true
  verify_listener 465 "Postfix SMTPS"
  verify_listener 587 "Postfix submission"
  verify_listener 993 "Dovecot IMAPS"
  verify_listener 995 "Dovecot POP3S"
}

random_secret() {
  openssl rand -base64 32 2>/dev/null | tr -dc 'A-Za-z0-9' | head -c 24 || date +%s%N
}

provision_system_mailbox() {
  local smtp_user="$1"
  local smtp_pass="$2"
  local local_user
  local shell_path
  local home_dir

  local_user="$(printf '%s' "${smtp_user%@*}" | tr -cd 'a-zA-Z0-9._-' | cut -c1-31)"
  local_user="${local_user:-noreply}"
  shell_path="/usr/sbin/nologin"
  [ -x "$shell_path" ] || shell_path="/bin/false"
  home_dir="/home/${local_user}"

  if ! id "$local_user" >/dev/null 2>&1; then
    useradd -m -d "$home_dir" -s "$shell_path" "$local_user" >/dev/null 2>&1 || true
  fi
  printf '%s:%s\n' "$local_user" "$smtp_pass" | chpasswd >/dev/null 2>&1 || true
  mkdir -p "$home_dir/Maildir/cur" "$home_dir/Maildir/new" "$home_dir/Maildir/tmp"
  chown -R "$local_user:$local_user" "$home_dir/Maildir" >/dev/null 2>&1 || true
  chmod -R 700 "$home_dir/Maildir" >/dev/null 2>&1 || true

  mkdir -p /etc/tiwlo-mail
cat >/etc/tiwlo-mail/system-smtp.env <<MAILENV
SMTP_HOST=127.0.0.1
SMTP_PUBLIC_HOST=${MAIL_HOSTNAME}
SMTP_TLS_SERVERNAME=${MAIL_HOSTNAME}
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=${local_user}
SMTP_PASS=${smtp_pass}
MAIL_FROM=${local_user}@${MAIL_DOMAIN}
MAIL_REPLY_TO=${EMAIL:-support@${MAIL_DOMAIN}}
MAILENV
  chmod 600 /etc/tiwlo-mail/system-smtp.env >/dev/null 2>&1 || true
}

configure_opendkim() {
  local mail_domain="$1"
  local selector="${TIWLO_DKIM_SELECTOR:-tiwlo}"
  local key_dir="/etc/opendkim/keys/${mail_domain}"
  local key_file="${key_dir}/${selector}.private"
  local txt_file="${key_dir}/${selector}.txt"
  local public_key

  if ! have opendkim-genkey; then
    return 0
  fi

  mkdir -p "$key_dir" /etc/opendkim
  if [ ! -f "$key_file" ]; then
    opendkim-genkey -b 2048 -s "$selector" -d "$mail_domain" -D "$key_dir" >/dev/null 2>&1 || true
  fi
  chown -R opendkim:opendkim "$key_dir" >/dev/null 2>&1 || true
  chmod 600 "$key_file" >/dev/null 2>&1 || true

  cat >/etc/opendkim.conf <<CONF
Syslog                  yes
UMask                   002
Canonicalization        relaxed/simple
Mode                    sv
SubDomains              yes
Socket                  inet:8891@127.0.0.1
PidFile                 /run/opendkim/opendkim.pid
KeyTable                refile:/etc/opendkim/key.table
SigningTable            refile:/etc/opendkim/signing.table
ExternalIgnoreList      /etc/opendkim/trusted.hosts
InternalHosts           /etc/opendkim/trusted.hosts
CONF
  printf '%s\n' "${selector}._domainkey.${mail_domain} ${mail_domain}:${selector}:${key_file}" >/etc/opendkim/key.table
  printf '%s\n' "*@${mail_domain} ${selector}._domainkey.${mail_domain}" >/etc/opendkim/signing.table
  printf '%s\n' "127.0.0.1" "localhost" "$mail_domain" ".${mail_domain}" >/etc/opendkim/trusted.hosts

  configure_postfix_delivery_safety
  mkdir -p /run/opendkim
  chown opendkim:opendkim /run/opendkim >/dev/null 2>&1 || true
  systemctl enable --now opendkim >/dev/null 2>&1 || true
  systemctl restart opendkim >/dev/null 2>&1 || true
  local milter_ready=0
  if have ss; then
    for _ in $(seq 1 10); do
      if ss -ltn 2>/dev/null | grep -Eq '(^|[[:space:]])127\.0\.0\.1:8891[[:space:]]|(^|[[:space:]])0\.0\.0\.0:8891[[:space:]]|(^|[[:space:]])\[::\]:8891[[:space:]]'; then
        milter_ready=1
        break
      fi
      sleep 1
    done
  fi
  if [ "${TIWLO_ENABLE_POSTFIX_DKIM_MILTER:-false}" = "true" ] && [ "$milter_ready" -eq 1 ]; then
    postconf -e "smtpd_milters = inet:127.0.0.1:8891" || true
    postconf -e "non_smtpd_milters = inet:127.0.0.1:8891" || true
  else
    echo "OpenDKIM key is available for app-side signing; Postfix milter disabled to avoid SMTP 451 tempfail."
    postconf -e "smtpd_milters =" || true
    postconf -e "non_smtpd_milters =" || true
  fi
  systemctl restart postfix >/dev/null 2>&1 || true

  if [ -f "$txt_file" ]; then
    public_key="$(cat "$txt_file" 2>/dev/null | awk -F'"' '/"/ { for (i = 2; i <= NF; i += 2) printf "%s", $i } END { print "" }' | sed -E 's/^.*p=//; s/[;[:space:]]+$//')"
    printf '%s' "$public_key"
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
  pdns-server pdns-backend-pgsql dnsutils \
  postfix dovecot-imapd dovecot-pop3d roundcube roundcube-core roundcube-pgsql \
  opendkim opendkim-tools rspamd mailutils libsasl2-modules cron openssl ssl-cert
systemctl enable --now postgresql nginx postfix dovecot opendkim certbot.timer pdns >/dev/null 2>&1 || true
ensure_system_postgres_database
configure_powerdns
configure_system_email_services
open_network_ports

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
SMTP_PASSWORD="${SMTP_PASS:-$(random_secret)}"
provision_system_mailbox "noreply" "$SMTP_PASSWORD"
DKIM_PUBLIC_KEY="$(configure_opendkim "$MAIL_DOMAIN" || true)"
mkdir -p x
{
  echo "SMTP_HOST=\"127.0.0.1\""
  echo "SMTP_PUBLIC_HOST=\"${MAIL_HOSTNAME}\""
  echo "SMTP_TLS_SERVERNAME=\"${MAIL_HOSTNAME}\""
  echo "SMTP_PORT=\"465\""
  echo "SMTP_SECURE=\"true\""
  echo "SMTP_TLS_REJECT_UNAUTHORIZED=\"false\""
  echo "SMTP_USER=\"noreply\""
  echo "SMTP_PASS=\"${SMTP_PASSWORD}\""
  echo "MAIL_FROM=\"noreply@${MAIL_DOMAIN}\""
  echo "MAIL_INLINE_LOGO=\"false\""
  echo "MAIL_FROM_NAME=\"Tiwlo\""
  echo "MAIL_REPLY_TO=\"${EMAIL:-support@${MAIL_DOMAIN}}\""
  echo "TIWLO_DKIM_SELECTOR=\"${TIWLO_DKIM_SELECTOR:-tiwlo}\""
  echo "TIWLO_DKIM_DOMAIN=\"${MAIL_DOMAIN}\""
  echo "TIWLO_DKIM_PRIVATE_KEY_PATH=\"/etc/opendkim/keys/${MAIL_DOMAIN}/${TIWLO_DKIM_SELECTOR:-tiwlo}.private\""
  if [ -n "$DKIM_PUBLIC_KEY" ]; then
    echo "TIWLO_DKIM_PUBLIC_KEY=\"${DKIM_PUBLIC_KEY}\""
  fi
  echo "POWERDNS_MODE=\"pgsql\""
  echo "POWERDNS_SERVER_IP=\"${PUBLIC_IP:-}\""
  echo "APP_DOMAIN=\"${DOMAIN:-tiwlo.com}\""
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
  SERVER_NAME="${DOMAIN} www.${DOMAIN} tmail.${DOMAIN} mail.${DOMAIN} email.${DOMAIN}"
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
open_network_ports
ufw --force enable >/dev/null 2>&1 || true

if [ -n "$DOMAIN" ] && ! is_ip_address "$DOMAIN"; then
  step "Requesting SSL certificate for ${DOMAIN}"
  CERTBOT_DOMAINS=(-d "$DOMAIN")
  if getent hosts "www.${DOMAIN}" >/dev/null 2>&1; then
    CERTBOT_DOMAINS+=(-d "www.${DOMAIN}")
  fi
  if getent hosts "tmail.${DOMAIN}" >/dev/null 2>&1; then
    CERTBOT_DOMAINS+=(-d "tmail.${DOMAIN}")
  fi
  if getent hosts "email.${DOMAIN}" >/dev/null 2>&1; then
    CERTBOT_DOMAINS+=(-d "email.${DOMAIN}")
  fi
  if getent hosts "mail.${DOMAIN}" >/dev/null 2>&1; then
    CERTBOT_DOMAINS+=(-d "mail.${DOMAIN}")
  fi
  if certbot --nginx "${CERTBOT_DOMAINS[@]}" --non-interactive --agree-tos -m "$EMAIL" --redirect; then
    systemctl reload nginx
    configure_system_email_services
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
echo "Nameservers: ns1.${MAIL_DOMAIN} / ns2.${MAIL_DOMAIN} (point registrar glue to ${PUBLIC_IP:-this server})"
echo "Tiwlo Mail: https://tmail.${MAIL_DOMAIN} (point tmail.${MAIL_DOMAIN} and mail.${MAIL_DOMAIN} DNS to this server)"
echo "Backend: http://127.0.0.1:${BACKEND_PORT}/graphql"
echo "Auto-start: systemd services tiwlo-backend and tiwlo-frontend are enabled."
