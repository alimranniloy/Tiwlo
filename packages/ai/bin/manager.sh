#!/usr/bin/env bash
# Tiwi Social AI infrastructure manager. Gemini is a hosted provider: this
# manager never downloads or runs a local LLM, GGUF file, TensorFlow model, or
# llama.cpp container.
set -euo pipefail

ROOT="${TIWLO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
STATE_DIR="${TIWLO_SOCIAL_AI_DATA_DIR:-$ROOT/.data/social-ai}"
LOG_DIR="${TIWLO_SOCIAL_AI_LOG_DIR:-$ROOT/.logs/social-ai}"
SECRETS_DIR="$STATE_DIR/secrets"
COMPOSE_FILE="$STATE_DIR/docker-compose.yml"
LOG_FILE="$LOG_DIR/manager.log"
JSON=0
mkdir -p "$STATE_DIR" "$SECRETS_DIR" "$LOG_DIR"
touch "$LOG_FILE"

# The backend and package manager receive the same private Gemini settings.
# Values stay in the preserved production .env; they are never written to logs
# or returned by an admin/API response.
load_environment() {
  local file line key value
  for file in "$ROOT/.env" "$ROOT/x/.env"; do
    [ -r "$file" ] || continue
    while IFS= read -r line || [ -n "$line" ]; do
      [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue
      line="${line#export }"
      key="${line%%=*}"; value="${line#*=}"
      value="${value%$'\r'}"
      # Match dotenv's normal quoted-value behavior without sourcing an env
      # file (which could execute shell syntax). This keeps model ids and
      # optional base URLs valid in manager health/tests.
      if [[ "$value" =~ ^\".*\"$ ]] || [[ "$value" =~ ^\'.*\'$ ]]; then
        value="${value:1:${#value}-2}"
      fi
      [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
      case "$key" in SOCIAL_GEMINI_API_KEY|GEMINI_API_KEY|SOCIAL_GEMINI_MODEL|SOCIAL_GEMINI_API_BASE_URL|SOCIAL_GEMINI_TIMEOUT_MS) export "$key=$value" ;; esac
    done <"$file"
  done
}
load_environment

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$LOG_FILE" >&2; }
progress() { printf 'PROGRESS %s %s\n' "$1" "$2"; }
die() { log "ERROR $*"; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }
json_escape() { node -e 'console.log(JSON.stringify(process.argv[1] || ""))' "$1"; }
emit() { [ "$JSON" = 1 ] && printf '{"ok":%s,"status":%s,"error":%s}\n' "$1" "$(json_escape "$2")" "$(json_escape "${3:-}")" || printf '%s\n' "$2"; }
finish_ok() { emit true "$1"; }
finish_error() { emit false error "$1"; exit 1; }

compose() {
  local env_file="$SECRETS_DIR/crawl4ai.env"
  if docker compose version >/dev/null 2>&1; then docker compose --env-file "$env_file" -f "$COMPOSE_FILE" "$@"; return; fi
  if have docker-compose; then docker-compose --env-file "$env_file" -f "$COMPOSE_FILE" "$@"; return; fi
  return 127
}

write_secret() {
  local file="$1"
  if [ ! -s "$file" ] || ! grep -Eq '^[a-f0-9]{64}$' "$file"; then umask 077; od -An -N32 -tx1 /dev/urandom | tr -d ' \n' >"$file"; fi
  chmod 600 "$file"
}

ensure_crawl4ai_credentials() {
  mkdir -p "$SECRETS_DIR"; chmod 700 "$SECRETS_DIR"
  write_secret "$SECRETS_DIR/crawl4ai-api-token"; write_secret "$SECRETS_DIR/crawl4ai-secret-key"; write_secret "$SECRETS_DIR/crawl4ai-redis-password"
  umask 077
  cat >"$SECRETS_DIR/crawl4ai.env" <<EOF
CRAWL4AI_API_TOKEN=$(tr -d '\r\n' <"$SECRETS_DIR/crawl4ai-api-token")
CRAWL4AI_SECRET_KEY=$(tr -d '\r\n' <"$SECRETS_DIR/crawl4ai-secret-key")
CRAWL4AI_REDIS_PASSWORD=$(tr -d '\r\n' <"$SECRETS_DIR/crawl4ai-redis-password")
EOF
  chmod 600 "$SECRETS_DIR/crawl4ai.env"
}

ensure_docker() {
  if have docker && { docker compose version >/dev/null 2>&1 || have docker-compose; }; then return; fi
  [ "$(id -u)" -eq 0 ] || die 'Docker is missing and the Social AI bootstrap requires a privileged deployment run.'
  have apt-get || die 'Docker is missing and this server is not an apt-based Linux host.'
  progress 8 'Installing Docker dependencies'
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y >>"$LOG_FILE" 2>&1
  if ! apt-get install -y ca-certificates curl docker.io docker-compose-plugin >>"$LOG_FILE" 2>&1; then
    log 'docker-compose-plugin is unavailable; retrying with docker-compose compatibility package'
    apt-get install -y ca-certificates curl docker.io docker-compose >>"$LOG_FILE" 2>&1
  fi
  systemctl enable --now docker >>"$LOG_FILE" 2>&1 || true
  have docker || die 'Docker installation did not complete'
}

write_compose() {
  ensure_crawl4ai_credentials
  cat >"$COMPOSE_FILE" <<EOF
services:
  searxng:
    image: searxng/searxng:latest
    restart: unless-stopped
    ports: ["127.0.0.1:8081:8080"]
    volumes: ["$STATE_DIR/searxng:/etc/searxng"]
  crawl4ai:
    image: unclecode/crawl4ai:latest
    restart: unless-stopped
    ports: ["127.0.0.1:11235:11235"]
    environment:
      CRAWL4AI_API_TOKEN: \${CRAWL4AI_API_TOKEN}
      CRAWL4AI_SECRET_KEY: \${CRAWL4AI_SECRET_KEY}
      CRAWL4AI_REDIS_PASSWORD: \${CRAWL4AI_REDIS_PASSWORD}
EOF
}

ensure_searxng_config() {
  mkdir -p "$STATE_DIR/searxng"
  [ -f "$STATE_DIR/searxng/settings.yml" ] || cat >"$STATE_DIR/searxng/settings.yml" <<'EOF'
use_default_settings: true
server:
  bind_address: "0.0.0.0"
  port: 8080
  secret_key: "tiwi-social-ai"
search:
  formats: [html, json]
EOF
}

gemini_configured() { [ -n "${SOCIAL_GEMINI_API_KEY:-${GEMINI_API_KEY:-}}" ]; }
gemini_model() { printf '%s' "${SOCIAL_GEMINI_MODEL:-gemini-flash-latest}"; }
gemini_base_url() { printf '%s' "${SOCIAL_GEMINI_API_BASE_URL:-https://generativelanguage.googleapis.com}" | sed 's:/*$::'; }
gemini_test() {
  gemini_configured || return 1
  local key="${SOCIAL_GEMINI_API_KEY:-${GEMINI_API_KEY:-}}" model response
  model="$(gemini_model)"
  response="$(curl -fsS --max-time 30 "$(gemini_base_url)/v1beta/models/${model}:generateContent" \
    -H 'Content-Type: application/json' -H "X-goog-api-key: $key" \
    -d '{"contents":[{"parts":[{"text":"Return exactly {\\"ok\\":true}."}]}],"generationConfig":{"temperature":0,"maxOutputTokens":32,"responseMimeType":"application/json"}}' 2>>"$LOG_FILE" || true)"
  node -e 'const body=JSON.parse(process.argv[1]||"{}"); const text=(body.candidates||[]).flatMap(x=>(x.content||{}).parts||[]).map(x=>x.text||"").join("\n"); process.exit(JSON.parse(text).ok===true?0:1);' "$response" 2>/dev/null
}

service_healthy() {
  case "$1" in
    gemini-api) gemini_configured ;;
    searxng) curl -fsS --max-time 5 http://127.0.0.1:8081/ >/dev/null 2>&1 ;;
    crawl4ai) curl -fsS --max-time 5 http://127.0.0.1:11235/health >/dev/null 2>&1 || curl -fsS --max-time 5 http://127.0.0.1:11235/docs >/dev/null 2>&1 || curl -fsS --max-time 5 http://127.0.0.1:11235/playground >/dev/null 2>&1 ;;
    queue-worker) systemctl is-active --quiet tiwlo-social-ai-worker.service 2>/dev/null ;;
    health-monitor) systemctl is-active --quiet tiwlo-social-ai-health.timer 2>/dev/null ;;
    *) return 1 ;;
  esac
}

cleanup_local_models() {
  progress 12 'Removing retired local AI models and llama.cpp runtime'
  if have docker; then
    docker ps -aq --filter 'name=social-ai-llama-cpp' | xargs -r docker rm -f >>"$LOG_FILE" 2>&1 || true
    docker image rm ghcr.io/ggml-org/llama.cpp:server >>"$LOG_FILE" 2>&1 || true
  fi
  rm -rf "$STATE_DIR/models" "$STATE_DIR/llama" "$STATE_DIR/active-model" "$STATE_DIR/default-model" "$STATE_DIR/text-policy-variant" "$STATE_DIR"/autoload-* 2>>"$LOG_FILE" || true
}

start_service() {
  local id="$1" attempts=45
  case "$id" in
    gemini-api)
      gemini_configured || die 'Social Gemini API key is not configured in the protected server environment.'
      progress 70 "Verifying $(gemini_model) API configuration"; service_healthy gemini-api; progress 100 'Gemini API is configured'; return ;;
    searxng|crawl4ai)
      ensure_docker; write_compose; ensure_searxng_config; progress 45 "Starting $id"
      compose up -d "$id" >>"$LOG_FILE" 2>&1 || die "$id could not be started; inspect $LOG_FILE"
      [ "$id" = crawl4ai ] && attempts=120 ;;
    queue-worker|health-monitor)
      [ "$(id -u)" -eq 0 ] || die "$id requires the deployment bootstrap to install its systemd unit"
      if [ "$id" = queue-worker ]; then systemctl enable --now tiwlo-social-ai-worker.service >>"$LOG_FILE" 2>&1; else systemctl enable --now tiwlo-social-ai-health.timer >>"$LOG_FILE" 2>&1; fi ;;
    *) die "Unknown package $id" ;;
  esac
  for _ in $(seq 1 "$attempts"); do service_healthy "$id" && { progress 100 "$id is healthy"; return; }; sleep 2; done
  die "$id did not become healthy; inspect $LOG_FILE"
}

stop_service() {
  case "$1" in
    searxng|crawl4ai) compose stop "$1" >>"$LOG_FILE" 2>&1 ;;
    queue-worker) systemctl disable --now tiwlo-social-ai-worker.service >>"$LOG_FILE" 2>&1 ;;
    health-monitor) systemctl disable --now tiwlo-social-ai-health.timer >>"$LOG_FILE" 2>&1 ;;
    gemini-api) die 'Gemini is a hosted provider. Remove its protected server key to disable it.' ;;
    *) die "Unknown package $1" ;;
  esac
  progress 100 "$1 stopped"
}

restart_service() {
  [ "$1" = gemini-api ] || stop_service "$1"
  start_service "$1"
  progress 100 "$1 restarted and healthy"
}

health_json() {
  local gemini=false searx=false crawl=false worker=false monitor=false
  service_healthy gemini-api && gemini=true || true; service_healthy searxng && searx=true || true; service_healthy crawl4ai && crawl=true || true
  service_healthy queue-worker && worker=true || true; service_healthy health-monitor && monitor=true || true
  printf '{"ok":true,"status":"ready","health":{"packages":{"gemini-api":{"healthy":%s,"status":%s,"model":%s},"searxng":{"healthy":%s},"crawl4ai":{"healthy":%s},"queue-worker":{"healthy":%s},"health-monitor":{"healthy":%s}},"models":{"gemini-flash":{"healthy":%s,"status":%s}},"services":{"searxng":%s,"crawl4ai":%s}}}\n' "$gemini" "$(json_escape "$([ "$gemini" = true ] && echo configured || echo not_configured)")" "$(json_escape "$(gemini_model)")" "$searx" "$crawl" "$worker" "$monitor" "$gemini" "$(json_escape "$([ "$gemini" = true ] && echo configured || echo not_configured)")" "$searx" "$crawl"
}

ensure_feature() {
  start_service gemini-api
  case "$1" in
    verification) start_service searxng; start_service crawl4ai ;;
    reportReview) start_service crawl4ai ;;
    *) : ;;
  esac
  progress 100 "$1 is ready through Gemini"
}

cleanup_runtime_cache() {
  [ "$(id -u)" -eq 0 ] || die 'Safe cache cleanup requires a privileged backend service'
  progress 5 'Cleaning retired Social AI local runtime'
  cleanup_local_models
  find "$LOG_DIR" -type f -name '*.log.*' -mtime +14 -delete 2>>"$LOG_FILE" || true
  progress 100 'Social AI local model cache removed'
  finish_ok 'cache cleared'
}

for arg in "$@"; do [ "$arg" = --json ] && JSON=1; done
command="${1:-}"; action="${2:-}"; id="${3:-}"
if [ "$command" != health ] && ! { [ "$command" = package ] && [ "$action" = logs ]; }; then
  if have flock; then exec 9>"$STATE_DIR/manager.lock"; flock -w "${TIWLO_SOCIAL_AI_LOCK_TIMEOUT_SECONDS:-1800}" 9 || die 'Another Social AI maintenance operation is running'; fi
fi

case "$command" in
  health) health_json ;;
  cleanup) cleanup_runtime_cache ;;
  bootstrap)
    progress 3 'Preparing Social AI infrastructure'; cleanup_local_models
    progress 18 'Verifying Gemini API'; start_service gemini-api
    progress 38 'Installing SearXNG'; start_service searxng
    progress 58 'Installing Crawl4AI'; start_service crawl4ai
    progress 78 'Starting persistent Social AI workers'; start_service queue-worker; start_service health-monitor
    progress 92 'Verifying Social AI health'; health_json
    ;;
  package)
    case "$action" in
      install|enable|start|autostart) start_service "$id"; finish_ok ready ;;
      restart) restart_service "$id"; finish_ok restarted ;;
      repair|update) [ "$id" = gemini-api ] || { ensure_docker; write_compose; compose pull "$id" >>"$LOG_FILE" 2>&1 || true; }; start_service "$id"; finish_ok repaired ;;
      disable|stop) stop_service "$id"; finish_ok stopped ;;
      health) service_healthy "$id" && finish_ok healthy || finish_error "$id is unhealthy" ;;
      test) [ "$id" = gemini-api ] && gemini_test && finish_ok connected || { [ "$id" = gemini-api ] && finish_error 'Gemini API connection test failed'; service_healthy "$id" && finish_ok healthy || finish_error "$id is unhealthy"; } ;;
      logs) tail -n 160 "$LOG_FILE"; finish_ok logs ;;
      *) finish_error 'Unsupported package action' ;;
    esac ;;
  model)
    [ "$id" = gemini-flash ] || finish_error 'Unknown hosted model'
    case "$action" in health) service_healthy gemini-api && finish_ok healthy || finish_error 'Gemini API is not configured' ;; test) gemini_test && finish_ok connected || finish_error 'Gemini API connection test failed' ;; *) finish_error 'Gemini is hosted; model files are not downloaded to this server.' ;; esac ;;
  feature) [ "$action" = ensure ] || finish_error 'Unsupported feature action'; ensure_feature "$id"; finish_ok ready ;;
  *) finish_error 'Usage: manager.sh health|cleanup|bootstrap|package|model|feature' ;;
esac
