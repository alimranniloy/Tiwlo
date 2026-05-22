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

echo "Welcome to tPanel Pro by Tiwlo"
echo "Checking license for ${SERVER_IP:-this server}..."

VERIFY_RESPONSE="$(curl -fsS -X POST "$API_BASE/tpanel/api/verify" -H "Content-Type: application/json" -d "$VERIFY_INPUT" 2>/dev/null || true)"
if ! echo "$VERIFY_RESPONSE" | grep -q '"ok":true'; then
  VERIFY_RESPONSE="$(curl -fsS -X POST "$API_BASE/graphql" -H "Content-Type: application/json" -d "$GRAPHQL_PAYLOAD" 2>/dev/null || true)"
fi

if ! echo "$VERIFY_RESPONSE" | grep -q '"ok":true'; then
  echo "License validation failed."
  echo "$VERIFY_RESPONSE"
  exit 1
fi

echo "License active. Installing runtime packages..."
if have apt-get; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y git curl wget ca-certificates openssl nodejs npm nginx ufw certbot python3 python3-certbot-nginx build-essential || true
elif have dnf; then
  dnf install -y git curl wget ca-certificates openssl nodejs npm nginx firewalld certbot python3 gcc gcc-c++ make || true
elif have yum; then
  yum install -y git curl wget ca-certificates openssl nodejs npm nginx firewalld certbot python3 gcc gcc-c++ make || true
else
  echo "Unsupported Linux package manager. Install git, curl, nodejs, npm, and nginx, then rerun."
  exit 1
fi

NPM_BIN="$(command -v npm || true)"
if [ -z "$NPM_BIN" ]; then
  echo "npm was not found after package installation."
  exit 1
fi
NODE_BIN_DIR="$(dirname "$NPM_BIN")"
SERVICE_PATH="${NODE_BIN_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

mkdir -p "$TPANEL_DIR"
if [ -d "$SOURCE_DIR/.git" ]; then
  git -C "$SOURCE_DIR" fetch origin "$BRANCH"
  if [ -n "$(git -C "$SOURCE_DIR" status --porcelain)" ]; then
    git -C "$SOURCE_DIR" stash push -u -m "tpanel-installer-autostash-$(date +%Y%m%d%H%M%S)" || true
  fi
  git -C "$SOURCE_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
  git -C "$SOURCE_DIR" reset --hard "origin/$BRANCH"
else
  rm -rf "$SOURCE_DIR"
  git clone --branch "$BRANCH" "$REPO_URL" "$SOURCE_DIR"
fi

cd "$APP_DIR"
npm install
npm run build

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
git -C "$SOURCE_DIR" pull --ff-only
cd "$APP_DIR"
npm install
npm run build
systemctl restart tpanel
echo "tPanel updated. Data was preserved."
BASH
chmod 700 /usr/local/sbin/tpanel-update

systemctl daemon-reload
systemctl enable --now tpanel

if have ufw; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw allow "$TPANEL_PORT/tcp" >/dev/null 2>&1 || true
fi

echo "tPanel Pro is running on port $TPANEL_PORT."
echo "Admin login: admin"
echo "Admin password saved at /root/tpanel-admin-password.txt"
