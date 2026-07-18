#!/usr/bin/env bash
set -euo pipefail

ROOT="${TIWLO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
MANAGER="$ROOT/packages/ai/bin/manager.sh"
LOG_DIR="${TIWLO_SOCIAL_AI_LOG_DIR:-$ROOT/.logs/social-ai}"
mkdir -p "$LOG_DIR"

snapshot="$("$MANAGER" health --json 2>>"$LOG_DIR/health.log" || true)"
printf '%s\n' "$snapshot" >>"$LOG_DIR/health.log"

# `health` intentionally reports a JSON snapshot even when a package is down,
# so inspect the required default services and models rather than trusting the
# command exit code.  Optional models are not downloaded just because a health
# timer ran.
if ! node -e '
const value = JSON.parse(process.argv[1] || "{}");
const h = value.health || {};
const p = h.packages || {}; const m = h.models || {};
const healthy = (x) => x && x.healthy === true;
process.exit(
  healthy(p.searxng) && healthy(p.crawl4ai) && healthy(p["llama-cpp"]) &&
  healthy(p["queue-worker"]) && healthy(p["health-monitor"]) &&
  healthy(m["text-policy"]) && healthy(m.embedding) && healthy(m["moderation-vision"])
    ? 0 : 1
);
' "$snapshot"; then
  printf '%s repairing required Social AI services\n' "$(date -u +%FT%TZ)" >>"$LOG_DIR/health.log"
  "$MANAGER" bootstrap --json >>"$LOG_DIR/health.log" 2>&1 || true
fi
