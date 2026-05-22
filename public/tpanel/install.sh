#!/usr/bin/env bash
set -euo pipefail

INSTALLER_URL="${TPANEL_INSTALLER_URL:-https://raw.githubusercontent.com/alimranniloy/Tiwlo/main/scripts/install-tpanel-node.sh}"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$INSTALLER_URL" | bash
elif command -v wget >/dev/null 2>&1; then
  wget -qO- "$INSTALLER_URL" | bash
else
  echo "curl or wget is required to download the tPanel installer."
  exit 1
fi
