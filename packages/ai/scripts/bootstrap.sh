#!/usr/bin/env bash
set -euo pipefail

ROOT="${TIWLO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
MANAGER="$ROOT/packages/ai/bin/manager.sh"
STATE_DIR="${TIWLO_SOCIAL_AI_DATA_DIR:-$ROOT/.data/social-ai}"
LOG_DIR="${TIWLO_SOCIAL_AI_LOG_DIR:-$ROOT/.logs/social-ai}"

[ "$(id -u)" -eq 0 ] || { echo "Social AI bootstrap must run from the secure root deployment." >&2; exit 1; }
mkdir -p "$STATE_DIR" "$LOG_DIR"
chmod 750 "$STATE_DIR" "$LOG_DIR"
chmod 750 "$MANAGER" "$ROOT/packages/ai/scripts/health-monitor.sh" "$ROOT/packages/ai/scripts/worker.sh"

cat >/etc/systemd/system/tiwlo-social-ai-health.service <<EOF
[Unit]
Description=Tiwlo Social AI Health Monitor
After=network-online.target docker.service

[Service]
Type=oneshot
Environment=TIWLO_ROOT=$ROOT
ExecStart=$ROOT/packages/ai/scripts/health-monitor.sh
EOF

cat >/etc/systemd/system/tiwlo-social-ai-health.timer <<'EOF'
[Unit]
Description=Run Tiwlo Social AI health monitor every minute

[Timer]
OnBootSec=45
OnUnitActiveSec=60
Persistent=true

[Install]
WantedBy=timers.target
EOF

cat >/etc/systemd/system/tiwlo-social-ai-worker.service <<EOF
[Unit]
Description=Tiwlo Social AI Persistent Queue Worker
After=network-online.target tiwlo-backend-obfuscated.service

[Service]
Type=simple
Restart=always
RestartSec=8
Environment=TIWLO_ROOT=$ROOT
WorkingDirectory=$ROOT
ExecStart=$ROOT/packages/ai/scripts/worker.sh

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now tiwlo-social-ai-health.timer
systemctl enable --now tiwlo-social-ai-worker.service
"$MANAGER" bootstrap --json
