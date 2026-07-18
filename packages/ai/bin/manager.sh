#!/usr/bin/env bash
# Tiwlo Social AI package manager. Every supported action is explicitly
# whitelisted below; it never evaluates an admin-supplied shell command.
set -euo pipefail

ROOT="${TIWLO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
STATE_DIR="${TIWLO_SOCIAL_AI_DATA_DIR:-$ROOT/.data/social-ai}"
LOG_DIR="${TIWLO_SOCIAL_AI_LOG_DIR:-$ROOT/.logs/social-ai}"
MODELS_DIR="$STATE_DIR/models"
SECRETS_DIR="$STATE_DIR/secrets"
COMPOSE_FILE="$STATE_DIR/docker-compose.yml"
LOG_FILE="$LOG_DIR/manager.log"
JSON="0"

mkdir -p "$STATE_DIR" "$MODELS_DIR" "$LOG_DIR"
touch "$LOG_FILE"

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$LOG_FILE" >&2; }
progress() { printf 'PROGRESS %s %s\n' "$1" "$2"; }
die() { log "ERROR $*"; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

json_escape() {
  node -e 'console.log(JSON.stringify(process.argv[1] || ""))' "$1"
}

emit() {
  local ok="$1" status="$2" error="${3:-}"
  if [ "$JSON" = "1" ]; then
    printf '{"ok":%s,"status":%s,"error":%s}\n' "$ok" "$(json_escape "$status")" "$(json_escape "$error")"
  else
    printf '%s\n' "$status"
  fi
}

finish_ok() { emit true "$1"; }
finish_error() { emit false "error" "$1"; exit 1; }

compose() {
  local env_file="$SECRETS_DIR/crawl4ai.env"
  if docker compose version >/dev/null 2>&1; then docker compose --env-file "$env_file" -f "$COMPOSE_FILE" "$@"; return; fi
  if have docker-compose; then docker-compose --env-file "$env_file" -f "$COMPOSE_FILE" "$@"; return; fi
  return 127
}

write_secret() {
  local file="$1"
  if [ ! -s "$file" ] || ! grep -Eq '^[a-f0-9]{64}$' "$file"; then
    umask 077
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n' >"$file"
  fi
  chmod 600 "$file"
}

ensure_crawl4ai_credentials() {
  # Crawl4AI 0.9+ deliberately binds only inside its own container when no
  # credential is configured. Persist private credentials outside the release
  # directory so upgrades do not invalidate API access or expose the port.
  mkdir -p "$SECRETS_DIR"
  chmod 700 "$SECRETS_DIR"
  write_secret "$SECRETS_DIR/crawl4ai-api-token"
  write_secret "$SECRETS_DIR/crawl4ai-secret-key"
  write_secret "$SECRETS_DIR/crawl4ai-redis-password"
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
  [ "$(id -u)" -eq 0 ] || die "Docker is missing and Social AI bootstrap requires a privileged deployment run."
  have apt-get || die "Docker is missing and this server is not an apt-based Linux host."
  progress 8 "Installing Docker dependencies"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y >>"$LOG_FILE" 2>&1
  # Ubuntu releases commonly provide docker-compose-plugin while Debian and
  # older VPS images package the compatible CLI as docker-compose. Support
  # both without making a missing plugin package abort the whole deployment.
  if ! apt-get install -y ca-certificates curl docker.io docker-compose-plugin >>"$LOG_FILE" 2>&1; then
    log "docker-compose-plugin is unavailable; retrying with docker-compose compatibility package"
    apt-get install -y ca-certificates curl docker.io docker-compose >>"$LOG_FILE" 2>&1
  fi
  systemctl enable --now docker >>"$LOG_FILE" 2>&1 || true
  have docker || die "Docker installation did not complete"
  { docker compose version >/dev/null 2>&1 || have docker-compose; } || die "Docker Compose installation did not complete"
}

write_compose() {
  local active_model="text-policy" model_file_name="qwen2.5-3b-instruct-q4_k_m.gguf" mmproj_line=""
  ensure_crawl4ai_credentials
  [ -f "$STATE_DIR/active-model" ] && active_model="$(cat "$STATE_DIR/active-model" 2>/dev/null || echo text-policy)"
  if [ "$active_model" = "vision-review" ]; then
    model_file_name="moondream2-text-model-f16.gguf"
    mmproj_line=', "--mmproj", "/models/moondream2-mmproj-f16.gguf"'
  fi
  cat >"$COMPOSE_FILE" <<'YAML'
services:
  searxng:
    image: searxng/searxng:latest
    restart: unless-stopped
    ports: ["127.0.0.1:8081:8080"]
    volumes:
      - ./searxng:/etc/searxng
    environment:
      - SEARXNG_BASE_URL=http://127.0.0.1:8081/
      - SEARXNG_SECRET=${SEARXNG_SECRET:-tiwlo-social-ai-local}
  crawl4ai:
    # Use the maintained server image rather than the legacy `basic` image.
    # The upstream project documents `latest` for self-hosted deployments and
    # ships the HTTP health endpoint in that image.
    image: unclecode/crawl4ai:latest
    restart: unless-stopped
    ports: ["127.0.0.1:11235:11235"]
    shm_size: 1gb
    environment:
      CRAWL4AI_API_TOKEN: ${CRAWL4AI_API_TOKEN}
      # A credential is required by Crawl4AI 0.9+ before it exposes the
      # container socket. Keep the host mapping loopback-only above.
      GUNICORN_BIND: 0.0.0.0:11235
      SECRET_KEY: ${CRAWL4AI_SECRET_KEY}
      REDIS_PASSWORD: ${CRAWL4AI_REDIS_PASSWORD}
  llama-cpp:
    image: ghcr.io/ggerganov/llama.cpp:server
    restart: unless-stopped
    ports: ["127.0.0.1:8082:8080"]
    volumes:
      - ./models:/models:ro
YAML
  printf '    command: ["-m", "/models/%s", "--host", "0.0.0.0", "--port", "8080", "-c", "4096", "-np", "2"%s]\n' "$model_file_name" "$mmproj_line" >>"$COMPOSE_FILE"
}

ensure_searxng_config() {
  mkdir -p "$STATE_DIR/searxng"
  # This is an internal-only service. Keeping the limiter off avoids an
  # unnecessary Redis dependency and makes the image boot on small VPS hosts.
  cat >"$STATE_DIR/searxng/settings.yml" <<'YAML'
use_default_settings: true
general:
  instance_name: "Tiwlo Social AI Search"
server:
  bind_address: "0.0.0.0"
  port: 8080
  secret_key: "tiwlo-social-ai-local"
  limiter: false
  public_instance: false
search:
  safe_search: 1
  formats:
    - html
    - json
YAML
}

model_file() {
  case "$1" in
    text-policy) echo "qwen2.5-3b-instruct-q4_k_m.gguf" ;;
    vision-review) echo "moondream2-text-model-f16.gguf" ;;
    embedding) echo "nomic-embed-text-v1.5.Q4_K_M.gguf" ;;
    moderation-vision) echo "nsfwjs-mobilenet-v2-mid" ;;
    *) return 1 ;;
  esac
}

model_url() {
  case "$1" in
    text-policy) echo "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf?download=true" ;;
    vision-review) echo "https://huggingface.co/moondream/moondream2-gguf/resolve/main/moondream2-text-model-f16.gguf?download=true" ;;
    embedding) echo "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf?download=true" ;;
    *) return 1 ;;
  esac
}

vision_projection_url() { echo "https://huggingface.co/moondream/moondream2-gguf/resolve/main/moondream2-mmproj-f16.gguf?download=true"; }

verify_gguf() {
  [ -s "$1" ] || return 1
  [ "$(head -c 4 "$1" 2>/dev/null || true)" = "GGUF" ]
}

download_model() {
  local id="$1" file url target part
  if [ "$id" = "moderation-vision" ]; then
    [ -d "$ROOT/x/node_modules/nsfwjs" ] || die "The Social backend dependency nsfwjs is missing. Run the normal backend deployment first."
    progress 100 "Verified local NSFW moderation model"
    return
  fi
  file="$(model_file "$id")" || die "Unknown model $id"
  url="$(model_url "$id")"
  target="$MODELS_DIR/$file"
  part="$target.part"
  if verify_gguf "$target"; then progress 100 "Verified $id"; return; fi
  have curl || { [ "$(id -u)" -eq 0 ] && apt-get install -y curl >>"$LOG_FILE" 2>&1 || die "curl is required to download models"; }
  progress 25 "Downloading $id"
  rm -f "$target" 2>/dev/null || true
  curl --fail --location --retry 3 --continue-at - --output "$part" "$url" >>"$LOG_FILE" 2>&1 || die "Download failed for $id"
  progress 85 "Verifying $id"
  if ! verify_gguf "$part"; then
    rm -f "$part"
    die "Model verification failed for $id"
  fi
  mv "$part" "$target"
  if [ "$id" = "vision-review" ]; then
    local projection="$MODELS_DIR/moondream2-mmproj-f16.gguf" projection_part="$MODELS_DIR/moondream2-mmproj-f16.gguf.part"
    if ! verify_gguf "$projection"; then
      progress 92 "Downloading vision projection"
      curl --fail --location --retry 3 --continue-at - --output "$projection_part" "$(vision_projection_url)" >>"$LOG_FILE" 2>&1 || die "Download failed for vision projection"
      if ! verify_gguf "$projection_part"; then
        rm -f "$projection_part"
        die "Vision projection verification failed"
      fi
      mv "$projection_part" "$projection"
    fi
  fi
  progress 100 "Installed and verified $id"
}

service_healthy() {
  case "$1" in
    # The homepage is a stable local readiness endpoint. A search request can
    # legitimately be rate-limited by an upstream engine even while SearXNG is
    # healthy, so it must not make package startup fail.
    searxng) curl -fsS --max-time 5 "http://127.0.0.1:8081/" >/dev/null 2>&1 ;;
    # Recent Crawl4AI images expose /health.  Older images used by existing
    # deployments may expose the FastAPI docs or playground first, while the
    # browser pool warms in the background.  Treat any local successful HTTP
    # response as a readiness signal; the worker's actual crawl request still
    # performs the functional check before using this service.
    crawl4ai)
      curl -fsS --max-time 5 "http://127.0.0.1:11235/health" >/dev/null 2>&1 ||
      curl -fsS --max-time 5 "http://127.0.0.1:11235/docs" >/dev/null 2>&1 ||
      curl -fsS --max-time 5 "http://127.0.0.1:11235/playground" >/dev/null 2>&1
      ;;
    llama-cpp) curl -fsS --max-time 5 "http://127.0.0.1:8082/health" >/dev/null 2>&1 ;;
    queue-worker) systemctl is-active --quiet tiwlo-social-ai-worker.service 2>/dev/null ;;
    health-monitor) systemctl is-active --quiet tiwlo-social-ai-health.timer 2>/dev/null ;;
    *) return 1 ;;
  esac
}

append_service_diagnostics() {
  local id="$1"
  {
    printf '\n===== %s diagnostic %s =====\n' "$id" "$(date -u +%FT%TZ)"
    compose ps "$id" || true
    compose logs --tail 120 "$id" || true
    printf '\n===== %s localhost probes =====\n' "$id"
    case "$id" in
      crawl4ai)
        curl -i --max-time 8 "http://127.0.0.1:11235/health" || true
        curl -i --max-time 8 "http://127.0.0.1:11235/docs" || true
        ;;
      searxng) curl -i --max-time 8 "http://127.0.0.1:8081/" || true ;;
      llama-cpp) curl -i --max-time 8 "http://127.0.0.1:8082/health" || true ;;
    esac
  } 2>&1 | tee -a "$LOG_FILE" >&2
}

start_service() {
  local id="$1"
  case "$id" in
    searxng|crawl4ai)
      ensure_docker; write_compose; ensure_searxng_config
      progress 45 "Starting $id"
      if ! compose up -d "$id" >>"$LOG_FILE" 2>&1; then
        append_service_diagnostics "$id"
        die "$id could not be started; inspect $LOG_FILE"
      fi
      ;;
    llama-cpp)
      ensure_docker; write_compose
      local active_model="text-policy"
      [ -f "$STATE_DIR/active-model" ] && active_model="$(cat "$STATE_DIR/active-model" 2>/dev/null || echo text-policy)"
      download_model "$active_model"
      progress 65 "Starting llama.cpp"
      compose up -d llama-cpp >>"$LOG_FILE" 2>&1
      ;;
    queue-worker|health-monitor)
      [ "$(id -u)" -eq 0 ] || die "$id requires the deployment bootstrap to install its systemd unit"
      if [ "$id" = "queue-worker" ]; then
        systemctl enable --now tiwlo-social-ai-worker.service >>"$LOG_FILE" 2>&1
      else
        systemctl enable --now tiwlo-social-ai-health.timer >>"$LOG_FILE" 2>&1
      fi
      ;;
    *) die "Unknown package $id" ;;
  esac
  # Chromium/browser-pool startup is substantially slower than the lightweight
  # SearXNG service, especially after a VPS reboot or a first image pull.
  # Give Crawl4AI four minutes before reporting a real failure.
  local attempts=45
  [ "$id" = "crawl4ai" ] && attempts=120
  for _ in $(seq 1 "$attempts"); do service_healthy "$id" && { progress 100 "$id is healthy"; return; }; sleep 2; done
  append_service_diagnostics "$id"
  die "$id did not become healthy; inspect $LOG_FILE"
}

stop_service() {
  case "$1" in
    searxng|crawl4ai|llama-cpp) compose stop "$1" >>"$LOG_FILE" 2>&1 ;;
    queue-worker) systemctl disable --now tiwlo-social-ai-worker.service >>"$LOG_FILE" 2>&1 ;;
    health-monitor) systemctl disable --now tiwlo-social-ai-health.timer >>"$LOG_FILE" 2>&1 ;;
    *) die "Unknown package $1" ;;
  esac
  progress 100 "$1 stopped"
}

restart_service() {
  local id="$1"
  case "$id" in
    searxng|crawl4ai|llama-cpp)
      ensure_docker; write_compose
      if [ "$id" = "llama-cpp" ]; then
        local active_model="text-policy"
        [ -f "$STATE_DIR/active-model" ] && active_model="$(cat "$STATE_DIR/active-model" 2>/dev/null || echo text-policy)"
        download_model "$active_model"
      fi
      compose restart "$id" >>"$LOG_FILE" 2>&1
      ;;
    queue-worker) systemctl enable --now tiwlo-social-ai-worker.service >>"$LOG_FILE" 2>&1; systemctl restart tiwlo-social-ai-worker.service >>"$LOG_FILE" 2>&1 ;;
    health-monitor) systemctl enable --now tiwlo-social-ai-health.timer >>"$LOG_FILE" 2>&1; systemctl start tiwlo-social-ai-health.service >>"$LOG_FILE" 2>&1 || true ;;
    *) die "Unknown package $id" ;;
  esac
  for _ in $(seq 1 18); do service_healthy "$id" && { progress 100 "$id restarted and healthy"; return; }; sleep 2; done
  append_service_diagnostics "$id"
  die "$id did not become healthy after restart"
}

health_json() {
  local searx="false" crawl="false" llama="false" text="false" vision="false" embed="false" nsfw="false"
  service_healthy searxng && searx="true" || true
  service_healthy crawl4ai && crawl="true" || true
  service_healthy llama-cpp && llama="true" || true
  verify_gguf "$MODELS_DIR/qwen2.5-3b-instruct-q4_k_m.gguf" && text="true" || true
  verify_gguf "$MODELS_DIR/moondream2-text-model-f16.gguf" && vision="true" || true
  verify_gguf "$MODELS_DIR/nomic-embed-text-v1.5.Q4_K_M.gguf" && embed="true" || true
  [ -d "$ROOT/x/node_modules/nsfwjs" ] && nsfw="true" || true
  printf '{"ok":true,"status":"ready","health":{"packages":{"searxng":{"healthy":%s},"crawl4ai":{"healthy":%s},"llama-cpp":{"healthy":%s},"queue-worker":{"healthy":%s},"health-monitor":{"healthy":%s}},"models":{"text-policy":{"healthy":%s},"vision-review":{"healthy":%s},"embedding":{"healthy":%s},"moderation-vision":{"healthy":%s}},"services":{"searxng":%s,"crawl4ai":%s,"llama-cpp":%s}}}\n' "$searx" "$crawl" "$llama" "$(service_healthy queue-worker && echo true || echo false)" "$(service_healthy health-monitor && echo true || echo false)" "$text" "$vision" "$embed" "$nsfw" "$searx" "$crawl" "$llama"
}

ensure_feature() {
  case "$1" in
    verification) start_service searxng; start_service crawl4ai; download_model text-policy; download_model embedding; start_service llama-cpp ;;
    reportReview|postReview|commentReview|messageModeration|appeal|harassment|hateSpeech|threat|drugSale|selfHarm) download_model text-policy; start_service llama-cpp ;;
    imageModeration|videoCaptionModeration|adultContent|violence|weaponSale) download_model moderation-vision; download_model vision-review; start_service llama-cpp ;;
    spam|scam|fakeAccount|fakeProfile|impersonation|copyright) download_model embedding; download_model text-policy; start_service llama-cpp ;;
    warning|strike|notificationAutomation) progress 100 "$1 uses the persistent Social API and needs no external model" ;;
    *) die "Unknown Social AI feature $1" ;;
  esac
}

for arg in "$@"; do [ "$arg" = "--json" ] && JSON="1"; done
command="${1:-}"; action="${2:-}"; id="${3:-}"

case "$command" in
  health) health_json ;;
  bootstrap)
    progress 3 "Preparing Social AI infrastructure"
    ensure_docker; [ -f "$STATE_DIR/active-model" ] || printf '%s\n' "text-policy" >"$STATE_DIR/active-model"; write_compose; ensure_searxng_config
    compose pull searxng crawl4ai llama-cpp >>"$LOG_FILE" 2>&1 || true
    # Keep the independent Social AI services progressing even when one
    # optional dependency (usually the browser crawler) is still warming or
    # needs repair. The persisted health timer retries the failed component.
    # A non-zero final status still accurately reports that repair is pending.
    bootstrap_pending=0
    progress 15 "Installing SearXNG"; if ! (start_service searxng); then bootstrap_pending=1; log "SearXNG is pending repair; continuing Social AI bootstrap"; fi
    progress 35 "Installing Crawl4AI"; if ! (start_service crawl4ai); then bootstrap_pending=1; log "Crawl4AI is pending repair; continuing Social AI bootstrap"; fi
    progress 55 "Installing default Social AI models"; if ! (download_model text-policy; download_model embedding; download_model moderation-vision); then bootstrap_pending=1; log "One or more Social AI models are pending repair"; fi
    progress 78 "Starting llama.cpp"; if ! (start_service llama-cpp); then bootstrap_pending=1; log "llama.cpp is pending repair; continuing Social AI bootstrap"; fi
    progress 90 "Verifying Social AI health"; health_json
    [ "$bootstrap_pending" -eq 0 ] || exit 1
    ;;
  package)
    case "$action" in
      install|enable|start|autostart|test) start_service "$id"; finish_ok "ready" ;;
      restart) restart_service "$id"; finish_ok "restarted" ;;
      repair)
        if [[ "$id" =~ ^(searxng|crawl4ai|llama-cpp)$ ]]; then ensure_docker; write_compose; compose pull "$id" >>"$LOG_FILE" 2>&1 || true; fi
        restart_service "$id"; finish_ok "repaired"
        ;;
      update)
        if [[ "$id" =~ ^(searxng|crawl4ai|llama-cpp)$ ]]; then
          ensure_docker; write_compose; compose pull "$id" >>"$LOG_FILE" 2>&1
        fi
        start_service "$id"; finish_ok "updated"
        ;;
      disable|stop) stop_service "$id"; finish_ok "stopped" ;;
      health) service_healthy "$id" && finish_ok "healthy" || finish_error "$id is unhealthy" ;;
      logs) tail -n 160 "$LOG_FILE"; finish_ok "logs" ;;
      *) finish_error "Unsupported package action" ;;
    esac
    ;;
  model)
    case "$action" in
      download|resume|install|repair) download_model "$id"; finish_ok "installed" ;;
      update)
        [ "$id" = "moderation-vision" ] || rm -f "$MODELS_DIR/$(model_file "$id")"
        download_model "$id"; finish_ok "updated"
        ;;
      load|run|restart)
        [ "$id" = "moderation-vision" ] && die "The local NSFW vision model is loaded by the Social media worker, not llama.cpp"
        printf '%s\n' "$id" >"$STATE_DIR/active-model"
        download_model "$id"
        if [ "$action" = "restart" ]; then restart_service llama-cpp; else start_service llama-cpp; fi
        finish_ok "running"
        ;;
      default)
        [ "$id" = "text-policy" ] || die "Only the policy text model can be the default llama.cpp server model"
        printf '%s\n' "$id" >"$STATE_DIR/default-model"
        printf '%s\n' "$id" >"$STATE_DIR/active-model"
        download_model text-policy; start_service llama-cpp; finish_ok "default"
        ;;
      autoload)
        printf '%s\n' "$id" >"$STATE_DIR/autoload-${id}"
        download_model "$id"
        if [ "$id" = "text-policy" ]; then start_service llama-cpp; fi
        finish_ok "autoload enabled"
        ;;
      delete) [ "$id" != "text-policy" ] || die "The default policy model cannot be deleted while Social AI is enabled"; rm -f "$MODELS_DIR/$(model_file "$id")"; [ "$id" != "vision-review" ] || rm -f "$MODELS_DIR/moondream2-mmproj-f16.gguf"; progress 100 "$id removed"; finish_ok "deleted" ;;
      health)
        if [ "$id" = "moderation-vision" ]; then
          [ -d "$ROOT/x/node_modules/nsfwjs" ] || die "Local NSFW moderation dependency is unavailable"
        else
          verify_gguf "$MODELS_DIR/$(model_file "$id")" || die "$id failed model verification"
        fi
        finish_ok "healthy"
        ;;
      *) finish_error "Unsupported model action" ;;
    esac
    ;;
  feature)
    [ "$action" = "ensure" ] || finish_error "Unsupported feature action"
    ensure_feature "$id"; finish_ok "ready"
    ;;
  *) finish_error "Usage: manager.sh health|bootstrap|package|model|feature" ;;
esac
