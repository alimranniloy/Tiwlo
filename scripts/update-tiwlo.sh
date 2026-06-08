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

if [ "${TIWLO_SECURE_OBFUSCATED_UPDATE:-1}" = "1" ] && [ "${TIWLO_LEGACY_UPDATE:-0}" != "1" ]; then
  echo "Secure obfuscated update is enabled. Delegating to the hard-wipe deploy pipeline..."
  export TIWLO_INSTALL_DIR="$ROOT"
  export TIWLO_REPO_URL="${TIWLO_REPO_URL:-https://github.com/alimranniloy/Tiwlo.git}"
  ROOT="$(realpath -m "$ROOT")"
  if [ -f "$ROOT/.git/config" ]; then
    detected_repo="$(git -C "$ROOT" config --get remote.origin.url 2>/dev/null || true)"
    [ -n "$detected_repo" ] && export TIWLO_REPO_URL="$detected_repo"
  fi

  export TIWLO_DEPLOY_TMP_BASE="${TIWLO_DEPLOY_TMP_BASE:-$(dirname "$ROOT")/.tiwlo-tmp}"
  export TIWLO_DEPLOY_SWAP_FILE="${TIWLO_DEPLOY_SWAP_FILE:-$(dirname "$ROOT")/.tiwlo-deploy.swap}"
  export TIWLO_DEPLOY_SWAP_MB="${TIWLO_DEPLOY_SWAP_MB:-4096}"
  mkdir -p "$TIWLO_DEPLOY_TMP_BASE"

  legacy_swap="$ROOT/.data/tiwlo-deploy.swap"
  if [ -f "$legacy_swap" ]; then
    swapoff "$legacy_swap" >/dev/null 2>&1 || true
    rm -f "$legacy_swap" >/dev/null 2>&1 || true
  fi
  find /tmp -path '*/tiwlo-deploy.swap' -type f -exec rm -f -- {} + >/dev/null 2>&1 || true
  find /tmp -maxdepth 1 -type d \( -name 'tiwlo-src.*' -o -name 'tiwlo-release.*' -o -name 'tiwlo-npm-cache.*' \) -exec rm -rf -- {} + >/dev/null 2>&1 || true

  if [ "${TIWLO_USE_LOCAL_DEPLOY_SCRIPT:-0}" = "1" ] && [ -f "$ROOT/scripts/deploy-obfuscated.sh" ]; then
    exec bash "$ROOT/scripts/deploy-obfuscated.sh"
  fi
  secure_deploy_script="$(mktemp "$TIWLO_DEPLOY_TMP_BASE/tiwlo-secure-deploy.XXXXXX.sh")"
  secure_deploy_url="https://raw.githubusercontent.com/alimranniloy/Tiwlo/${TIWLO_GIT_BRANCH:-main}/scripts/deploy-obfuscated.sh?fresh=$(date +%s)"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -H 'Cache-Control: no-cache' "$secure_deploy_url" -o "$secure_deploy_script"
  elif command -v wget >/dev/null 2>&1; then
    wget --no-cache -qO "$secure_deploy_script" "$secure_deploy_url"
  else
    echo "curl or wget is required to fetch the secure deploy script." >&2
    exit 1
  fi
  chmod 700 "$secure_deploy_script"
  export TIWLO_DEPLOY_SELF_REEXEC=1
  export TIWLO_DEPLOY_SELF_COPY="$secure_deploy_script"
  exec bash "$secure_deploy_script"
fi

if [ ! -d "$ROOT/.git" ]; then
  echo "Could not find a Tiwlo git checkout at $ROOT."
  echo "Run from the Tiwlo directory or set TIWLO_INSTALL_DIR=/path/to/Tiwlo."
  exit 1
fi

cd "$ROOT"

BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

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
  printf '%s' "$1" | sed -E 's#^https?://##; s#/.*$##; s#:[0-9]+$##; s#^((mail|email|tmail|www)\.)+##'
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

configure_postfix_delivery_safety() {
  if ! command -v postconf >/dev/null 2>&1; then
    return 0
  fi

  run_sudo postconf -e "milter_default_action = accept" || true
  run_sudo postconf -e "milter_protocol = 6" || true
  run_sudo postconf -e "milter_connect_timeout = 3s" || true
  run_sudo postconf -e "milter_command_timeout = 10s" || true
  run_sudo postconf -e "milter_content_timeout = 30s" || true
  run_sudo postconf -e "smtpd_milters =" || true
  run_sudo postconf -e "non_smtpd_milters =" || true
  run_sudo postconf -e "content_filter =" || true
  run_sudo postconf -e "smtpd_proxy_filter =" || true
  run_sudo postconf -e "smtpd_client_restrictions = permit_mynetworks,permit_sasl_authenticated" || true
  run_sudo postconf -e "smtpd_helo_restrictions =" || true
  run_sudo postconf -e "smtpd_sender_restrictions =" || true
  run_sudo postconf -e "smtpd_data_restrictions =" || true
  run_sudo postconf -e "smtpd_end_of_data_restrictions =" || true
  run_sudo postconf -e "smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination" || true
  run_sudo postconf -e "smtpd_relay_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination" || true
  run_sudo postconf -P "submission/inet/smtpd_client_restrictions=permit_sasl_authenticated" || true
  run_sudo postconf -P "submission/inet/smtpd_sender_restrictions=" || true
  run_sudo postconf -P "submission/inet/smtpd_data_restrictions=" || true
  run_sudo postconf -P "submission/inet/smtpd_end_of_data_restrictions=" || true
  run_sudo postconf -P "submission/inet/smtpd_milters=" || true
  run_sudo postconf -P "submission/inet/content_filter=" || true
  run_sudo postconf -P "submission/inet/smtpd_relay_restrictions=permit_sasl_authenticated,reject" || true
  run_sudo postconf -P "smtps/inet/smtpd_client_restrictions=permit_sasl_authenticated" || true
  run_sudo postconf -P "smtps/inet/smtpd_sender_restrictions=" || true
  run_sudo postconf -P "smtps/inet/smtpd_data_restrictions=" || true
  run_sudo postconf -P "smtps/inet/smtpd_end_of_data_restrictions=" || true
  run_sudo postconf -P "smtps/inet/smtpd_milters=" || true
  run_sudo postconf -P "smtps/inet/content_filter=" || true
  run_sudo postconf -P "smtps/inet/smtpd_relay_restrictions=permit_sasl_authenticated,reject" || true
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

wait_http() {
  local url="$1"
  local label="$2"
  local tries="${3:-45}"
  local attempt
  for attempt in $(seq 1 "$tries"); do
    if command -v curl >/dev/null 2>&1 && curl -fsS "$url" >/dev/null 2>&1; then
      echo "${label}: healthy at ${url}"
      return 0
    fi
    sleep 1
  done
  echo "${label}: not responding at ${url}"
  return 1
}

show_service_diagnostics() {
  local service="$1"
  if command -v systemctl >/dev/null 2>&1; then
    run_sudo systemctl --no-pager --full status "$service" || true
    run_sudo journalctl -u "$service" -n 80 --no-pager || true
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
  run_sudo postconf -e "mydestination = \$myhostname, localhost.\$mydomain, localhost, \$mydomain" || true
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
  configure_postfix_delivery_safety
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
  configure_postfix_delivery_safety

  run_sudo mkdir -p /etc/dovecot/conf.d

  write_dovecot_auth_config() {
    local mode="${1:-modern}"
    local username_format="auth_username_format = %{user | username}"
    if [ "$mode" = "legacy" ]; then
      username_format="auth_username_format = %n"
    elif [ "$mode" = "minimal" ]; then
      username_format=""
    fi
    cat <<DOVECOT | run_sudo tee /etc/dovecot/conf.d/99-tiwlo-mail-auth.conf >/dev/null
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
SMTP_USER=${local_user}
SMTP_PASS=${smtp_pass}
MAIL_FROM=${local_user}@${mail_domain}
MAIL_REPLY_TO=${local_user}@${mail_domain}
MAILENV
  run_sudo chmod 600 /etc/tiwlo-mail/system-smtp.env >/dev/null 2>&1 || true
}

install_mailbox_provision_helper() {
  run_sudo mkdir -p /usr/local/sbin
  cat <<'HELPER' | run_sudo tee /usr/local/sbin/tiwlo-mailbox-provision >/dev/null
#!/usr/bin/env bash
set -euo pipefail

local_user="$(printf '%s' "${1:-}" | tr -cd 'a-zA-Z0-9._-' | cut -c1-31)"
mail_pass="${2:-}"
mail_domain="$(printf '%s' "${3:-tiwlo.com}" | tr '[:upper:]' '[:lower:]' | sed -E 's#^((mail|email|tmail|www)\.)+##; s#[^a-z0-9.-]##g; s#^\.+|\.+$##g')"
mail_address="${4:-${local_user}@${mail_domain}}"

[ -n "$local_user" ] || { echo "local user is required" >&2; exit 2; }
[ -n "$mail_pass" ] || { echo "mail password is required" >&2; exit 2; }
shell_path="/usr/sbin/nologin"
[ -x "$shell_path" ] || shell_path="/bin/false"
home_dir="/home/${local_user}"

if ! id "$local_user" >/dev/null 2>&1; then
  useradd -m -d "$home_dir" -s "$shell_path" "$local_user" >/dev/null 2>&1 || true
fi
printf '%s:%s\n' "$local_user" "$mail_pass" | chpasswd >/dev/null 2>&1 || true
mkdir -p "$home_dir/Maildir/cur" "$home_dir/Maildir/new" "$home_dir/Maildir/tmp"
chown -R "$local_user:$local_user" "$home_dir/Maildir" >/dev/null 2>&1 || true
chmod -R 700 "$home_dir/Maildir" >/dev/null 2>&1 || true

if command -v postconf >/dev/null 2>&1; then
  postconf -e "mydestination = \$myhostname, localhost.\$mydomain, localhost, \$mydomain" >/dev/null 2>&1 || true
fi

printf 'provisioned %s as %s\n' "$mail_address" "$local_user"
HELPER
  run_sudo chmod 750 /usr/local/sbin/tiwlo-mailbox-provision
}

configure_opendkim() {
  local mail_domain="$1"
  local selector="${TIWLO_DKIM_SELECTOR:-tiwlo}"
  local key_dir="/etc/opendkim/keys/${mail_domain}"
  local key_file="${key_dir}/${selector}.private"
  local txt_file="${key_dir}/${selector}.txt"
  local public_key

  if ! command -v opendkim-genkey >/dev/null 2>&1; then
    return 0
  fi

  run_sudo mkdir -p "$key_dir" /etc/opendkim
  if [ ! -f "$key_file" ]; then
    run_sudo opendkim-genkey -b 2048 -s "$selector" -d "$mail_domain" -D "$key_dir" >/dev/null 2>&1 || true
  fi
  run_sudo chown -R opendkim:opendkim "$key_dir" >/dev/null 2>&1 || true
  run_sudo chmod 600 "$key_file" >/dev/null 2>&1 || true

  cat <<CONF | run_sudo tee /etc/opendkim.conf >/dev/null
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
  printf '%s\n' "${selector}._domainkey.${mail_domain} ${mail_domain}:${selector}:${key_file}" | run_sudo tee /etc/opendkim/key.table >/dev/null
  printf '%s\n' "*@${mail_domain} ${selector}._domainkey.${mail_domain}" | run_sudo tee /etc/opendkim/signing.table >/dev/null
  printf '%s\n' "127.0.0.1" "localhost" "$mail_domain" ".${mail_domain}" | run_sudo tee /etc/opendkim/trusted.hosts >/dev/null

  configure_postfix_delivery_safety
  run_sudo mkdir -p /run/opendkim
  run_sudo chown opendkim:opendkim /run/opendkim >/dev/null 2>&1 || true
  run_sudo systemctl enable --now opendkim >/dev/null 2>&1 || true
  run_sudo systemctl restart opendkim >/dev/null 2>&1 || true
  local milter_ready=0
  if command -v ss >/dev/null 2>&1; then
    for _ in $(seq 1 10); do
      if ss -ltn 2>/dev/null | grep -Eq '(^|[[:space:]])127\.0\.0\.1:8891[[:space:]]|(^|[[:space:]])0\.0\.0\.0:8891[[:space:]]|(^|[[:space:]])\[::\]:8891[[:space:]]'; then
        milter_ready=1
        break
      fi
      sleep 1
    done
  fi
  if [ "${TIWLO_ENABLE_POSTFIX_DKIM_MILTER:-false}" = "true" ] && [ "$milter_ready" -eq 1 ]; then
    run_sudo postconf -e "smtpd_milters = inet:127.0.0.1:8891" || true
    run_sudo postconf -e "non_smtpd_milters = inet:127.0.0.1:8891" || true
  else
    echo "OpenDKIM key is available for app-side signing; Postfix milter disabled to avoid SMTP 451 tempfail."
    run_sudo postconf -e "smtpd_milters =" || true
    run_sudo postconf -e "non_smtpd_milters =" || true
  fi
  run_sudo systemctl restart postfix >/dev/null 2>&1 || true

  if [ -f "$txt_file" ]; then
    public_key="$(run_sudo cat "$txt_file" 2>/dev/null | awk -F'"' '/"/ { for (i = 2; i <= NF; i += 2) printf "%s", $i } END { print "" }' | sed -E 's/^.*p=//; s/[;[:space:]]+$//')"
    printf '%s' "$public_key"
  fi
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

current_env_or_default() {
  local file="$1"
  local key="$2"
  local fallback="$3"
  local value
  value="$(get_env_value "$file" "$key" || true)"
  printf '%s' "${value:-$fallback}"
}

ensure_systemd_services() {
  if ! command -v systemctl >/dev/null 2>&1; then
    return 0
  fi

  local npm_bin
  npm_bin="$(command -v npm || true)"
  if [ -z "$npm_bin" ]; then
    npm_bin="$(find "$ROOT/.tools/node" -path '*/bin/npm' -type f 2>/dev/null | sort | tail -n 1 || true)"
  fi
  if [ -z "$npm_bin" ]; then
    echo "npm was not found; cannot repair systemd services."
    return 1
  fi

  local node_bin_dir
  local service_path
  local frontend_origin
  local api_base_url
  node_bin_dir="$(dirname "$npm_bin")"
  service_path="${node_bin_dir}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  frontend_origin="$(current_env_or_default "$ROOT/x/.env" FRONTEND_ORIGIN "http://127.0.0.1:${FRONTEND_PORT}")"
  api_base_url="$(current_env_or_default "$ROOT/x/.env" API_BASE_URL "$frontend_origin")"

  set_env_value "$ROOT/x/.env" PORT "$BACKEND_PORT"
  set_env_value "$ROOT/x/.env" FRONTEND_ORIGIN "$frontend_origin"
  set_env_value "$ROOT/x/.env" API_BASE_URL "$api_base_url"
  set_env_value "$ROOT/.env" VITE_GRAPHQL_URL "${FRONTEND_GRAPHQL_URL:-/graphql}"

  cat <<SERVICE | run_sudo tee /etc/systemd/system/tiwlo-backend.service >/dev/null
[Unit]
Description=Tiwlo GraphQL Backend
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${ROOT}/x
EnvironmentFile=${ROOT}/x/.env
Environment=NODE_ENV=production
Environment=PATH=${service_path}
Environment=PORT=${BACKEND_PORT}
ExecStart=${npm_bin} run start
ExecStartPost=/bin/bash -lc 'for i in \$(seq 1 45); do curl -fsS http://127.0.0.1:${BACKEND_PORT}/health >/dev/null 2>&1 && exit 0; sleep 1; done; echo "Tiwlo backend did not become healthy on port ${BACKEND_PORT}" >&2; exit 1'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

  cat <<SERVICE | run_sudo tee /etc/systemd/system/tiwlo-frontend.service >/dev/null
[Unit]
Description=Tiwlo Frontend
After=network-online.target tiwlo-backend.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${ROOT}
EnvironmentFile=${ROOT}/.env
Environment=NODE_ENV=production
Environment=PATH=${service_path}
Environment=FRONTEND_PORT=${FRONTEND_PORT}
Environment=BACKEND_URL=http://127.0.0.1:${BACKEND_PORT}
ExecStart=${npm_bin} run start -- --port ${FRONTEND_PORT}
ExecStartPost=/bin/bash -lc 'for i in \$(seq 1 45); do curl -fsS http://127.0.0.1:${FRONTEND_PORT} >/dev/null 2>&1 && exit 0; sleep 1; done; echo "Tiwlo frontend did not become healthy on port ${FRONTEND_PORT}" >&2; exit 1'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

  run_sudo systemctl daemon-reload
  run_sudo systemctl enable tiwlo-backend tiwlo-frontend >/dev/null 2>&1 || true
  run_sudo systemctl restart tiwlo-backend || true
  run_sudo systemctl restart tiwlo-frontend || true
}

verify_web_stack() {
  local failed=0
  if ! wait_http "http://127.0.0.1:${BACKEND_PORT}/health" "Tiwlo backend" 45; then
    failed=1
    show_service_diagnostics tiwlo-backend
  fi
  if ! wait_http "http://127.0.0.1:${FRONTEND_PORT}" "Tiwlo frontend" 45; then
    failed=1
    show_service_diagnostics tiwlo-frontend
  fi
  if [ "$failed" -ne 0 ]; then
    echo "Tiwlo web stack is not healthy; refusing to finish with a silent nginx 502."
    exit 1
  fi
  if command -v nginx >/dev/null 2>&1; then
    run_sudo nginx -t >/dev/null 2>&1 && run_sudo systemctl reload nginx >/dev/null 2>&1 || true
  fi
}

echo "Updating Tiwlo code..."
git pull --ff-only

install_system_email_stack
install_mailbox_provision_helper
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
SYSTEM_SMTP_USER="${SYSTEM_SMTP_USER%@*}"
SYSTEM_SMTP_PASS="$(get_env_value "$ROOT/x/.env" SMTP_PASS)"
SYSTEM_SMTP_PASS="${SYSTEM_SMTP_PASS:-$(random_secret)}"
DKIM_PUBLIC_KEY="$(configure_opendkim "$MAIL_DOMAIN" || true)"
set_env_value "$ROOT/x/.env" SMTP_HOST "127.0.0.1"
set_env_value "$ROOT/x/.env" SMTP_PUBLIC_HOST "mail.${MAIL_DOMAIN}"
set_env_value "$ROOT/x/.env" SMTP_TLS_SERVERNAME "mail.${MAIL_DOMAIN}"
set_env_value "$ROOT/x/.env" SMTP_USER "$SYSTEM_SMTP_USER"
set_env_value "$ROOT/x/.env" SMTP_PASS "$SYSTEM_SMTP_PASS"
set_env_value "$ROOT/x/.env" TIWLO_MAILBOX_HELPER "/usr/local/sbin/tiwlo-mailbox-provision"
set_env_value "$ROOT/x/.env" MAIL_FROM "${SYSTEM_SMTP_USER}@${MAIL_DOMAIN}"
set_env_value "$ROOT/x/.env" MAIL_INLINE_LOGO "false"
set_env_value_if_missing "$ROOT/x/.env" MAIL_FROM_NAME "Tiwlo"
set_env_value_if_missing "$ROOT/x/.env" MAIL_REPLY_TO "${SYSTEM_SMTP_USER}@${MAIL_DOMAIN}"
provision_system_mailbox "$MAIL_DOMAIN" "$SYSTEM_SMTP_USER" "$SYSTEM_SMTP_PASS"
DKIM_SELECTOR="${TIWLO_DKIM_SELECTOR:-tiwlo}"
DKIM_KEY_PATH="/etc/opendkim/keys/${MAIL_DOMAIN}/${DKIM_SELECTOR}.private"
if run_sudo test -f "$DKIM_KEY_PATH"; then
  set_env_value "$ROOT/x/.env" TIWLO_DKIM_PRIVATE_KEY_PATH "$DKIM_KEY_PATH"
  set_env_value "$ROOT/x/.env" TIWLO_DKIM_DOMAIN "$MAIL_DOMAIN"
  set_env_value "$ROOT/x/.env" TIWLO_DKIM_SELECTOR "$DKIM_SELECTOR"
fi
if [ -n "$DKIM_PUBLIC_KEY" ]; then
  set_env_value "$ROOT/x/.env" TIWLO_DKIM_SELECTOR "$DKIM_SELECTOR"
  set_env_value "$ROOT/x/.env" TIWLO_DKIM_PUBLIC_KEY "$DKIM_PUBLIC_KEY"
fi
if [ -n "${FRONTEND_ORIGIN:-}" ]; then
  set_env_value "$ROOT/.env" APP_URL "$FRONTEND_ORIGIN"
  set_env_value "$ROOT/x/.env" FRONTEND_ORIGIN "$FRONTEND_ORIGIN"
fi
if [ -n "${API_BASE_URL:-}" ]; then
  set_env_value "$ROOT/x/.env" API_BASE_URL "$API_BASE_URL"
fi

echo "Installing dependencies..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
if [ -f x/package-lock.json ]; then
  npm --prefix x ci
else
  npm --prefix x install
fi

echo "Preparing Prisma without deleting data..."
npm --prefix x run db:generate
npm --prefix x run db:push
node "$ROOT/x/scripts/sync-mailboxes.mjs" || true

echo "Building frontend..."
npm run build
if [ -d "$ROOT/src/tPanel" ]; then
  if [ -f src/tPanel/package-lock.json ]; then
    npm --prefix src/tPanel ci
  else
    npm --prefix src/tPanel install
  fi
  npm --prefix src/tPanel run build
fi

echo "Repairing and restarting Tiwlo web services..."
ensure_systemd_services
verify_web_stack

echo "Tiwlo update complete. Existing PostgreSQL data was preserved."
