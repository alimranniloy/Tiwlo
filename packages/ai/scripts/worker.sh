#!/usr/bin/env bash
set -euo pipefail

# Launch the real persistent PostgreSQL-backed Social AI worker.  This helper
# is also useful outside systemd; production installs invoke the same worker
# directly from the service unit.
ROOT="${TIWLO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
cd "$ROOT"
exec node "$ROOT/x/src/workers/social-ai-worker.js"
