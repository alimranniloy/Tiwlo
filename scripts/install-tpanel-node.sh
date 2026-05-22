#!/usr/bin/env bash
set -euo pipefail

API_BASE="${TPANEL_API_BASE:-https://tiwlo.com}"
LICENSE_KEY="${TPANEL_LICENSE_KEY:-${1:-}}"
TPANEL_DIR="${TPANEL_DIR:-/opt/tpanel}"
SOURCE_DIR="$TPANEL_DIR/source"
APP_DIR="$SOURCE_DIR/src/tPanel"
TPANEL_PORT="${TPANEL_PORT:-2086}"
TPANEL_DOMAIN="${TPANEL_DOMAIN:-tiwlo.com}"
REPO_URL="${TPANEL_REPO_URL:-https://github.com/alimranniloy/Tiwlo.git}"
BRANCH="${TPANEL_BRANCH:-main}"
TOOLS_DIR="$TPANEL_DIR/tools"
DOWNLOADS_DIR="$TOOLS_DIR/downloads"
NODE_VERSION="${TPANEL_NODE_VERSION:-24.15.0}"
NODE_OS="linux"
case "$(uname -m)" in
  x86_64|amd64) NODE_ARCH="x64" ;;
  arm64|aarch64) NODE_ARCH="arm64" ;;
  *) echo "Unsupported CPU architecture for automatic Node.js download: $(uname -m)" >&2; exit 1 ;;
esac
NODE_FOLDER="node-v${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}"
NODE_TARBALL="${NODE_FOLDER}.tar.xz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}"
NODE_BIN_DIR=""
NPM_BIN=""

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: curl -fsSL https://tiwlo.com/tpanel/install.sh | sudo env TPANEL_LICENSE_KEY=KEY bash"
  exit 1
fi

if [ -z "$LICENSE_KEY" ]; then
  echo "Missing tPanel license key."
  exit 1
fi

have() {
  command -v "$1" >/dev/null 2>&1
}

line() {
  printf '%s\n' '------------------------------------------------------------'
}

step() {
  printf '[INFO] %s\n' "$1"
}

ok() {
  printf '[OK]   %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1"
}

download() {
  local url="$1"
  local output="$2"
  [ -f "$output" ] && return 0
  if have curl; then
    curl -fL "$url" -o "$output"
  elif have wget; then
    wget -O "$output" "$url"
  else
    echo "curl or wget is required to download Node.js." >&2
    exit 1
  fi
}

ensure_node() {
  if have node && have npm && [ "$(node -v)" = "v${NODE_VERSION}" ]; then
    NODE_BIN_DIR="$(dirname "$(command -v node)")"
    NPM_BIN="$(command -v npm)"
    export PATH="$NODE_BIN_DIR:$PATH"
    return 0
  fi

  local node_root="$TOOLS_DIR/node"
  local node_bin="$node_root/$NODE_FOLDER/bin"
  mkdir -p "$node_root" "$DOWNLOADS_DIR"
  if [ ! -x "$node_bin/node" ]; then
    step "Installing bundled Node.js v${NODE_VERSION}"
    download "$NODE_URL" "$DOWNLOADS_DIR/$NODE_TARBALL"
    tar -xJf "$DOWNLOADS_DIR/$NODE_TARBALL" -C "$node_root"
  fi

  NODE_BIN_DIR="$node_bin"
  NPM_BIN="$node_bin/npm"
  export PATH="$NODE_BIN_DIR:$PATH"
  if [ "$("$node_bin/node" -v)" != "v${NODE_VERSION}" ]; then
    echo "Bundled Node.js installation failed."
    exit 1
  fi
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

server_ip() {
  if have curl; then
    curl -fsS --max-time 8 https://api.ipify.org 2>/dev/null && return 0
  fi
  hostname -I 2>/dev/null | awk '{print $1}'
}

SERVER_IP="$(server_ip || true)"
FINGERPRINT="$(cat /etc/machine-id 2>/dev/null || hostname)"
HOSTNAME_VALUE="$(hostname -f 2>/dev/null || hostname)"
OS_VALUE="$(. /etc/os-release 2>/dev/null && echo "$ID-$VERSION_ID" || uname -s)"

LICENSE_ESCAPED="$(json_escape "$LICENSE_KEY")"
SERVER_IP_ESCAPED="$(json_escape "$SERVER_IP")"
FINGERPRINT_ESCAPED="$(json_escape "$FINGERPRINT")"
HOSTNAME_ESCAPED="$(json_escape "$HOSTNAME_VALUE")"
OS_ESCAPED="$(json_escape "$OS_VALUE")"

VERIFY_INPUT="{\"licenseKey\":\"$LICENSE_ESCAPED\",\"serverIp\":\"$SERVER_IP_ESCAPED\",\"fingerprint\":\"$FINGERPRINT_ESCAPED\",\"hostname\":\"$HOSTNAME_ESCAPED\",\"os\":\"$OS_ESCAPED\",\"agentVersion\":\"1.1.0\"}"
GRAPHQL_QUERY='mutation Check($input: TPanelLicenseCheckInput!) { tPanelLicenseCheck(input: $input) { ok status message serverTime } }'
GRAPHQL_QUERY_ESCAPED="$(json_escape "$GRAPHQL_QUERY")"
GRAPHQL_PAYLOAD="{\"query\":\"$GRAPHQL_QUERY_ESCAPED\",\"variables\":{\"input\":$VERIFY_INPUT}}"

printf '\n'
line
printf ' tPanel Pro Installer\n'
line
printf ' API Endpoint : %s\n' "$API_BASE"
printf ' Server IP    : %s\n' "${SERVER_IP:-auto-detect}"
printf ' Panel Port   : %s\n' "$TPANEL_PORT"
line
step "Validating license"

VERIFY_RESPONSE="$(curl -fsS -X POST "$API_BASE/tpanel/api/verify" -H "Content-Type: application/json" -d "$VERIFY_INPUT" 2>/dev/null || true)"
if ! echo "$VERIFY_RESPONSE" | grep -q '"ok":true'; then
  VERIFY_RESPONSE="$(curl -fsS -X POST "$API_BASE/graphql" -H "Content-Type: application/json" -d "$GRAPHQL_PAYLOAD" 2>/dev/null || true)"
fi

if ! echo "$VERIFY_RESPONSE" | grep -q '"ok":true'; then
  fail "License validation failed"
  echo "$VERIFY_RESPONSE"
  exit 1
fi

ok "License validated"
step "Installing runtime packages"
if have apt-get; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y git curl wget ca-certificates openssl xz-utils nginx ufw certbot python3 python3-certbot-nginx build-essential || true
elif have dnf; then
  dnf install -y git curl wget ca-certificates openssl xz nginx firewalld certbot python3 gcc gcc-c++ make || true
elif have yum; then
  yum install -y git curl wget ca-certificates openssl xz nginx firewalld certbot python3 gcc gcc-c++ make || true
else
  echo "Unsupported Linux package manager. Install git, curl, xz, and nginx, then rerun."
  exit 1
fi

ensure_node
SERVICE_PATH="${NODE_BIN_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ok "Using Node.js $("${NODE_BIN_DIR}/node" -v) and npm $("$NPM_BIN" -v)"

mkdir -p "$TPANEL_DIR"
if [ -d "$SOURCE_DIR/.git" ]; then
  step "Updating tPanel source"
  git -C "$SOURCE_DIR" fetch origin "$BRANCH"
  if [ -n "$(git -C "$SOURCE_DIR" status --porcelain)" ]; then
    git -C "$SOURCE_DIR" stash push -u -m "tpanel-installer-autostash-$(date +%Y%m%d%H%M%S)" || true
  fi
  git -C "$SOURCE_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
  git -C "$SOURCE_DIR" reset --hard "origin/$BRANCH"
else
  step "Cloning tPanel source"
  rm -rf "$SOURCE_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$SOURCE_DIR"
fi

cd "$APP_DIR"
install_app_dependencies() {
  rm -rf node_modules package-lock.json
  "$NPM_BIN" install --include=optional
}

step "Installing application dependencies"
install_app_dependencies
step "Building tPanel application"
if ! "$NPM_BIN" run build; then
  step "Build failed; retrying after a clean dependency install"
  install_app_dependencies
  "$NPM_BIN" run build
fi

mkdir -p /etc/tpanel /var/lib/tpanel /var/log/tpanel
if [ -f /root/tpanel-admin-password.txt ]; then
  ADMIN_PASSWORD="$(cat /root/tpanel-admin-password.txt)"
else
  ADMIN_PASSWORD="$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 20)"
  echo "$ADMIN_PASSWORD" >/root/tpanel-admin-password.txt
  chmod 600 /root/tpanel-admin-password.txt
fi

cat >/etc/tpanel/agent.env <<ENV
API_BASE=$API_BASE
LICENSE_KEY=$LICENSE_KEY
SERVER_IP=$SERVER_IP
FINGERPRINT=$FINGERPRINT
HOSTNAME_VALUE=$HOSTNAME_VALUE
OS_VALUE=$OS_VALUE
SOURCE_DIR=$SOURCE_DIR
APP_DIR=$APP_DIR
TPANEL_PORT=$TPANEL_PORT
TPANEL_DOMAIN=$TPANEL_DOMAIN
TIWLO_API_URL=$API_BASE
TPANEL_LICENSE_KEY=$LICENSE_KEY
TPANEL_SERVER_IP=$SERVER_IP
TPANEL_SERVER_FINGERPRINT=$FINGERPRINT
TPANEL_ADMIN_USER=admin
TPANEL_ADMIN_PASSWORD=$ADMIN_PASSWORD
NODE_ENV=production
PORT=$TPANEL_PORT
NODE_BIN_DIR=$NODE_BIN_DIR
NPM_BIN=$NPM_BIN
ENV
chmod 600 /etc/tpanel/agent.env

cat >/etc/tpanel/domain-settings.json <<DOMAINJSON
{
  "primaryDomain": "$TPANEL_DOMAIN",
  "panelUrl": "https://$TPANEL_DOMAIN",
  "detectedServerIp": "$SERVER_IP",
  "autoDetectIp": true,
  "enableNginxProxy": true,
  "enableSsl": true
}
DOMAINJSON
chmod 600 /etc/tpanel/domain-settings.json

cat >/etc/systemd/system/tpanel.service <<SERVICE
[Unit]
Description=tPanel Pro By Tiwlo
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=/etc/tpanel/agent.env
Environment=PATH=$SERVICE_PATH
ExecStart=$NPM_BIN run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat >/usr/local/sbin/tpanel-update <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo tpanel-update"
  exit 1
fi
. /etc/tpanel/agent.env
export PATH="${NODE_BIN_DIR:-/usr/local/bin}:$PATH"
NPM_BIN="${NPM_BIN:-npm}"
git -C "$SOURCE_DIR" pull --ff-only
cd "$APP_DIR"
install_app_dependencies() {
  rm -rf node_modules package-lock.json
  "$NPM_BIN" install --include=optional
}
install_app_dependencies
if ! "$NPM_BIN" run build; then
  echo "Build failed. Retrying after a clean dependency install..."
  install_app_dependencies
  "$NPM_BIN" run build
fi
systemctl restart tpanel
echo "tPanel updated. Data was preserved."
BASH
chmod 700 /usr/local/sbin/tpanel-update

cat >/etc/systemd/system/tpanel-auto-update.service <<SERVICE
[Unit]
Description=tPanel Pro automatic update
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/tpanel-update
SERVICE

cat >/etc/systemd/system/tpanel-auto-update.timer <<SERVICE
[Unit]
Description=Run tPanel Pro automatic update checks

[Timer]
OnBootSec=5min
OnUnitActiveSec=10min
Persistent=true

[Install]
WantedBy=timers.target
SERVICE

cat >/usr/local/sbin/tpanel-license-renew <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/etc/tpanel/agent.env"
OVERRIDE_LICENSE_KEY="${TPANEL_LICENSE_KEY:-}"

line() {
  printf '%s\n' '------------------------------------------------------------'
}

info() {
  printf '[INFO] %s\n' "$1"
}

ok() {
  printf '[OK]   %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

server_ip() {
  if have curl; then
    curl -fsS --max-time 8 https://api.ipify.org 2>/dev/null && return 0
  fi
  hostname -I 2>/dev/null | awk '{print $1}'
}

persist_env_value() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

if [ "$(id -u)" -ne 0 ]; then
  fail "Run as root: sudo tpanel-license-renew"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  fail "$ENV_FILE was not found. Install tPanel first."
  exit 1
fi

. "$ENV_FILE"
if [ -n "$OVERRIDE_LICENSE_KEY" ]; then
  LICENSE_KEY="$OVERRIDE_LICENSE_KEY"
  TPANEL_LICENSE_KEY="$OVERRIDE_LICENSE_KEY"
fi

API_BASE="${API_BASE:-${TIWLO_API_URL:-https://tiwlo.com}}"
LICENSE_KEY="${LICENSE_KEY:-${TPANEL_LICENSE_KEY:-}}"
SERVER_IP="${TPANEL_SERVER_IP:-${SERVER_IP:-$(server_ip || true)}}"
FINGERPRINT="${TPANEL_SERVER_FINGERPRINT:-${FINGERPRINT:-$(cat /etc/machine-id 2>/dev/null || hostname)}}"
HOSTNAME_VALUE="${HOSTNAME_VALUE:-$(hostname -f 2>/dev/null || hostname)}"
OS_VALUE="${OS_VALUE:-$(. /etc/os-release 2>/dev/null && echo "$ID-$VERSION_ID" || uname -s)}"

printf '\n'
line
printf ' tPanel License Refresh\n'
line
printf ' API Endpoint : %s\n' "$API_BASE"
printf ' Server IP    : %s\n' "${SERVER_IP:-auto-detect}"
line

if [ -z "$LICENSE_KEY" ]; then
  fail "No license key is configured"
  printf 'Command      : sudo env TPANEL_LICENSE_KEY="YOUR_LICENSE_KEY" tpanel-license-renew\n'
  exit 1
fi

LICENSE_ESCAPED="$(json_escape "$LICENSE_KEY")"
SERVER_IP_ESCAPED="$(json_escape "$SERVER_IP")"
FINGERPRINT_ESCAPED="$(json_escape "$FINGERPRINT")"
HOSTNAME_ESCAPED="$(json_escape "$HOSTNAME_VALUE")"
OS_ESCAPED="$(json_escape "$OS_VALUE")"
VERIFY_INPUT="{\"licenseKey\":\"$LICENSE_ESCAPED\",\"serverIp\":\"$SERVER_IP_ESCAPED\",\"fingerprint\":\"$FINGERPRINT_ESCAPED\",\"hostname\":\"$HOSTNAME_ESCAPED\",\"os\":\"$OS_ESCAPED\",\"agentVersion\":\"1.1.0\"}"
GRAPHQL_QUERY='mutation Check($input: TPanelLicenseCheckInput!) { tPanelLicenseCheck(input: $input) { ok status message serverTime } }'
GRAPHQL_QUERY_ESCAPED="$(json_escape "$GRAPHQL_QUERY")"
GRAPHQL_PAYLOAD="{\"query\":\"$GRAPHQL_QUERY_ESCAPED\",\"variables\":{\"input\":$VERIFY_INPUT}}"

info "Contacting license server"
VERIFY_RESPONSE="$(curl -fsS -X POST "$API_BASE/tpanel/api/verify" -H "Content-Type: application/json" -d "$VERIFY_INPUT" 2>/dev/null || true)"
if ! echo "$VERIFY_RESPONSE" | grep -q '"ok":true'; then
  VERIFY_RESPONSE="$(curl -fsS -X POST "$API_BASE/graphql" -H "Content-Type: application/json" -d "$GRAPHQL_PAYLOAD" 2>/dev/null || true)"
fi

if echo "$VERIFY_RESPONSE" | grep -q '"ok":true'; then
  persist_env_value "LICENSE_KEY" "$LICENSE_KEY"
  persist_env_value "TPANEL_LICENSE_KEY" "$LICENSE_KEY"
  persist_env_value "SERVER_IP" "$SERVER_IP"
  persist_env_value "TPANEL_SERVER_IP" "$SERVER_IP"
  systemctl restart tpanel
  ok "License refreshed and tPanel restarted"
  printf 'Status       : active\n'
  printf 'Panel URL    : http://%s:%s/\n' "${SERVER_IP:-SERVER_IP}" "${TPANEL_PORT:-2086}"
  exit 0
fi

fail "License refresh failed"
printf '%s\n' "$VERIFY_RESPONSE"
printf '\n'
printf 'Next command : sudo env TPANEL_LICENSE_KEY="YOUR_LICENSE_KEY" tpanel-license-renew\n'
exit 1
BASH
chmod 700 /usr/local/sbin/tpanel-license-renew
ln -sf /usr/local/sbin/tpanel-license-renew /usr/local/sbin/tpanel-license-status

systemctl daemon-reload
systemctl enable --now tpanel
systemctl enable --now tpanel-auto-update.timer >/dev/null 2>&1 || true

if have ufw; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw allow "$TPANEL_PORT/tcp" >/dev/null 2>&1 || true
fi

printf '\n'
line
ok "Installation complete"
printf 'Panel URL       : http://%s:%s/\n' "${SERVER_IP:-SERVER_IP}" "$TPANEL_PORT"
printf 'Admin user      : admin\n'
printf 'Password file   : /root/tpanel-admin-password.txt\n'
printf 'License refresh : sudo tpanel-license-renew\n'
line
