#!/usr/bin/env bash
set -euo pipefail

API_BASE="${TPANEL_API_BASE:-https://tiwlo.com}"
LICENSE_KEY="${TPANEL_LICENSE_KEY:-${1:-}}"

cat <<'MSG'
tPanel installer fallback loaded.

This URL is being served by the public frontend. For a full install, the
/tpanel/install.sh path should be proxied to the Tiwlo backend, or the license
must be passed through TPANEL_LICENSE_KEY.
MSG

if [ -z "$LICENSE_KEY" ]; then
  cat <<'MSG'

Missing license key.

Use:
  curl -fsSL "https://tiwlo.com/tpanel/install.sh" | sudo env TPANEL_LICENSE_KEY="YOUR_LICENSE_KEY" bash

If you still see this fallback on a production domain, add the Nginx/API proxy
for /tpanel/install.sh and /tpanel/api before trying again.
MSG
  exit 64
fi

echo
echo "License key was provided, but the backend installer endpoint was not reached."
echo "Expected backend route: $API_BASE/tpanel/install.sh"
echo "Fix the domain proxy, then rerun the install command."
exit 69
