#!/usr/bin/env bash
set -euo pipefail

ROOT="${TIWLO_INSTALL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${TIWLO_GIT_BRANCH:-main}"
REPO_URL="${TIWLO_REPO_URL:-}"
PM2_APP_NAME="${TIWLO_PM2_APP_NAME:-tiwlo-backend-obfuscated}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
RUN_DB_PUSH="${TIWLO_RUN_DB_PUSH:-1}"
RUN_FRONTEND_BUILD="${TIWLO_BUILD_FRONTEND:-1}"
STOP_SYSTEMD_BACKEND="${TIWLO_STOP_SYSTEMD_BACKEND:-1}"
RESTART_SYSTEMD_FRONTEND="${TIWLO_RESTART_SYSTEMD_FRONTEND:-1}"
OBFUSCATOR_VERSION="${JAVASCRIPT_OBFUSCATOR_VERSION:-4.1.1}"
TMP_BASE="${TIWLO_DEPLOY_TMP_BASE:-/tmp}"
TOOL_DIR="${TIWLO_OBFUSCATOR_TOOL_DIR:-$ROOT/.tools/javascript-obfuscator}"
INSTALL_UPDATE_COMMAND="${TIWLO_INSTALL_UPDATE_COMMAND:-1}"
UPDATE_COMMAND_PATH="${TIWLO_UPDATE_COMMAND_PATH:-/usr/local/bin/tiwlo-secure-update}"
DEPLOY_SWAP_MB="${TIWLO_DEPLOY_SWAP_MB:-2048}"
DEPLOY_SWAP_FILE="${TIWLO_DEPLOY_SWAP_FILE:-$ROOT/.data/tiwlo-deploy.swap}"
KEEP_DEPLOY_SWAP="${TIWLO_KEEP_DEPLOY_SWAP:-0}"
NPM_CACHE_DIR="${TIWLO_NPM_CACHE_DIR:-$ROOT/.data/npm-cache}"
NODE_OLD_SPACE_MB="${TIWLO_NODE_OLD_SPACE_MB:-1536}"

CHECKOUT_DIR=""
RELEASE_DIR=""
PRESERVE_DIR=""
SELF_COPY="${TIWLO_DEPLOY_SELF_COPY:-}"
OBFUSCATOR_BIN=""
DEPLOY_SWAP_CREATED="0"

step() {
  printf '\n==> %s\n' "$*"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

run_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif have sudo; then
    sudo "$@"
  else
    "$@"
  fi
}

realpath_m() {
  realpath -m "$1"
}

cleanup() {
  [ -n "$CHECKOUT_DIR" ] && rm -rf -- "$CHECKOUT_DIR"
  [ -n "$RELEASE_DIR" ] && rm -rf -- "$RELEASE_DIR"
  [ -n "$PRESERVE_DIR" ] && rm -rf -- "$PRESERVE_DIR"
  [ -n "$SELF_COPY" ] && rm -f -- "$SELF_COPY"
  if [ "$DEPLOY_SWAP_CREATED" = "1" ] && [ "$KEEP_DEPLOY_SWAP" != "1" ]; then
    run_sudo swapoff "$DEPLOY_SWAP_FILE" >/dev/null 2>&1 || true
    run_sudo rm -f "$DEPLOY_SWAP_FILE" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

self_reexec_from_temp() {
  if [ "${TIWLO_DEPLOY_SELF_REEXEC:-0}" = "1" ]; then
    return 0
  fi
  local source_file="${BASH_SOURCE[0]:-$0}"
  if [ ! -f "$source_file" ]; then
    return 0
  fi
  SELF_COPY="$(mktemp "$TMP_BASE/tiwlo-obfuscated-deploy.XXXXXX.sh")"
  cp "$source_file" "$SELF_COPY"
  chmod 700 "$SELF_COPY"
  export TIWLO_DEPLOY_SELF_REEXEC=1
  export TIWLO_DEPLOY_SELF_COPY="$SELF_COPY"
  exec "$SELF_COPY" "$@"
}

assert_safe_root() {
  ROOT="$(realpath_m "$ROOT")"
  case "$ROOT" in
    ""|"/"|"/root"|"/home"|"/var"|"/var/www"|"/usr"|"/opt"|"/tmp")
      echo "Unsafe TIWLO_INSTALL_DIR: $ROOT" >&2
      exit 1
      ;;
  esac
  mkdir -p "$ROOT"
  if [ ! -d "$ROOT" ]; then
    echo "Production root does not exist: $ROOT" >&2
    exit 1
  fi
}

resolve_repo_url() {
  if [ -n "$REPO_URL" ]; then
    return 0
  fi
  if [ -d "$ROOT/.git" ]; then
    REPO_URL="$(git -C "$ROOT" config --get remote.origin.url || true)"
  fi
  REPO_URL="${REPO_URL:-https://github.com/alimranniloy/Tiwlo.git}"
}

install_external_update_command() {
  if [ "$INSTALL_UPDATE_COMMAND" != "1" ]; then
    return 0
  fi
  local source_file="${BASH_SOURCE[0]:-$0}"
  if [ ! -f "$source_file" ]; then
    return 0
  fi
  step "Installing external secure update command"
  if run_sudo mkdir -p "$(dirname "$UPDATE_COMMAND_PATH")" >/dev/null 2>&1 \
    && run_sudo cp "$source_file" "$UPDATE_COMMAND_PATH" >/dev/null 2>&1 \
    && run_sudo chmod 700 "$UPDATE_COMMAND_PATH" >/dev/null 2>&1; then
    echo "Future updates: sudo TIWLO_INSTALL_DIR=$ROOT $UPDATE_COMMAND_PATH"
  else
    echo "Could not install $UPDATE_COMMAND_PATH; use the GitHub raw script command for future updates." >&2
  fi
}

current_swap_mb() {
  if [ -r /proc/meminfo ]; then
    awk '/^SwapTotal:/ { print int($2 / 1024) }' /proc/meminfo
  else
    echo 0
  fi
}

ensure_deploy_swap() {
  if [ "$(uname -s)" != "Linux" ] || [ "${DEPLOY_SWAP_MB:-0}" = "0" ]; then
    return 0
  fi
  if [ "$(current_swap_mb)" -ge 512 ]; then
    return 0
  fi

  step "Creating temporary deploy swap (${DEPLOY_SWAP_MB}MB) to prevent npm OOM kills"
  mkdir -p "$(dirname "$DEPLOY_SWAP_FILE")"
  if [ ! -f "$DEPLOY_SWAP_FILE" ]; then
    if have fallocate; then
      run_sudo fallocate -l "${DEPLOY_SWAP_MB}M" "$DEPLOY_SWAP_FILE"
    else
      run_sudo dd if=/dev/zero of="$DEPLOY_SWAP_FILE" bs=1M count="$DEPLOY_SWAP_MB" status=none
    fi
    run_sudo chmod 600 "$DEPLOY_SWAP_FILE"
    run_sudo mkswap "$DEPLOY_SWAP_FILE" >/dev/null
  fi
  run_sudo swapon "$DEPLOY_SWAP_FILE"
  DEPLOY_SWAP_CREATED="1"
}

prepare_low_memory_node_env() {
  mkdir -p "$NPM_CACHE_DIR"
  export npm_config_cache="$NPM_CACHE_DIR"
  export npm_config_audit=false
  export npm_config_fund=false
  export npm_config_progress=false
  export npm_config_prefer_offline=true
  export npm_config_update_notifier=false
  export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=$NODE_OLD_SPACE_MB"
}

copy_tree() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  if have rsync; then
    rsync -a --delete "$src" "$dest"
  else
    rm -rf -- "$dest"
    cp -a "$src" "$dest"
  fi
}

preserve_path() {
  local relative="$1"
  local label="$2"
  local source="$ROOT/$relative"
  if [ ! -e "$source" ] && [ ! -L "$source" ]; then
    return 0
  fi
  mkdir -p "$PRESERVE_DIR/$(dirname "$label")"
  mv "$source" "$PRESERVE_DIR/$label"
}

restore_path() {
  local label="$1"
  local relative="$2"
  local source="$PRESERVE_DIR/$label"
  if [ ! -e "$source" ] && [ ! -L "$source" ]; then
    return 0
  fi
  mkdir -p "$ROOT/$(dirname "$relative")"
  rm -rf -- "$ROOT/$relative"
  mv "$source" "$ROOT/$relative"
}

hard_wipe_existing_production_code() {
  step "Hard wiping readable source and old .git from production root"
  PRESERVE_DIR="$(mktemp -d "$TMP_BASE/tiwlo-preserve.XXXXXX")"

  preserve_path ".env" "root.env"
  preserve_path "x/.env" "x.env"
  preserve_path "public/uploads" "public/uploads"
  preserve_path ".data" "data"
  preserve_path ".logs" "logs"
  preserve_path ".tools" "tools"

  # This is the strict wipe point: it removes old source folders, .git, scripts,
  # TypeScript/JavaScript source, previous checkout files, and stale dist.
  find "$ROOT" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +

  mkdir -p "$ROOT"
  restore_path "root.env" ".env"
  restore_path "x.env" "x/.env"
  restore_path "public/uploads" "public/uploads"
  restore_path "data" ".data"
  restore_path "logs" ".logs"
  restore_path "tools" ".tools"
}

clone_fresh_source_to_temp() {
  step "Cloning fresh source into temporary checkout"
  CHECKOUT_DIR="$(mktemp -d "$TMP_BASE/tiwlo-src.XXXXXX")"
  rm -rf -- "$CHECKOUT_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$CHECKOUT_DIR"

  [ -f "$ROOT/.env" ] && cp "$ROOT/.env" "$CHECKOUT_DIR/.env"
  if [ -f "$ROOT/x/.env" ]; then
    mkdir -p "$CHECKOUT_DIR/x"
    cp "$ROOT/x/.env" "$CHECKOUT_DIR/x/.env"
  fi
}

install_dependencies_and_build() {
  ensure_deploy_swap
  prepare_low_memory_node_env

  step "Installing dependencies inside temporary checkout"
  cd "$CHECKOUT_DIR"
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund --progress=false || npm install --no-audit --no-fund --progress=false
  else
    npm install --no-audit --no-fund --progress=false
  fi
  if [ -f x/package-lock.json ]; then
    npm --prefix x ci --no-audit --no-fund --progress=false || npm --prefix x install --no-audit --no-fund --progress=false
  else
    npm --prefix x install --no-audit --no-fund --progress=false
  fi

  step "Preparing Prisma from temporary checkout"
  npm --prefix x run db:generate
  if [ "$RUN_DB_PUSH" = "1" ]; then
    npm --prefix x run db:push
  fi

  if [ "$RUN_FRONTEND_BUILD" = "1" ]; then
    step "Building frontend in temporary checkout"
    npm run build
  fi
}

ensure_obfuscator() {
  if have javascript-obfuscator; then
    OBFUSCATOR_BIN="$(command -v javascript-obfuscator)"
    return 0
  fi

  step "Installing javascript-obfuscator outside readable source"
  mkdir -p "$TOOL_DIR"
  if [ ! -f "$TOOL_DIR/package.json" ]; then
    (cd "$TOOL_DIR" && npm init -y >/dev/null)
  fi
  npm --prefix "$TOOL_DIR" install "javascript-obfuscator@$OBFUSCATOR_VERSION" --omit=dev
  OBFUSCATOR_BIN="$TOOL_DIR/node_modules/.bin/javascript-obfuscator"
}

obfuscate_dir() {
  local dir="$1"
  local threshold="${2:-0.55}"
  "$OBFUSCATOR_BIN" "$dir" --output "$dir" \
    --target node \
    --compact true \
    --identifier-names-generator hexadecimal \
    --rename-globals false \
    --control-flow-flattening false \
    --dead-code-injection false \
    --debug-protection false \
    --disable-console-output false \
    --self-defending false \
    --simplify true \
    --string-array true \
    --string-array-encoding base64 \
    --string-array-threshold "$threshold" \
    --rotate-string-array true \
    --shuffle-string-array true \
    --split-strings false \
    --transform-object-keys false \
    --numbers-to-expressions false \
    --source-map false
}

obfuscate_file() {
  local file="$1"
  "$OBFUSCATOR_BIN" "$file" --output "$file" \
    --target node \
    --compact true \
    --identifier-names-generator hexadecimal \
    --rename-globals false \
    --control-flow-flattening false \
    --dead-code-injection false \
    --debug-protection false \
    --disable-console-output false \
    --self-defending false \
    --simplify true \
    --string-array true \
    --string-array-encoding base64 \
    --string-array-threshold 0.45 \
    --source-map false
}

prepare_obfuscated_release() {
  step "Preparing final obfuscated runtime release"
  RELEASE_DIR="$(mktemp -d "$TMP_BASE/tiwlo-release.XXXXXX")"

  mkdir -p "$RELEASE_DIR/x" "$RELEASE_DIR/public" "$RELEASE_DIR/scripts"
  copy_tree "$CHECKOUT_DIR/x/src/" "$RELEASE_DIR/x/src"
  copy_tree "$CHECKOUT_DIR/tSecurity/" "$RELEASE_DIR/tSecurity"
  copy_tree "$CHECKOUT_DIR/x/graphql/" "$RELEASE_DIR/x/graphql"
  [ -d "$CHECKOUT_DIR/x/private-assets" ] && copy_tree "$CHECKOUT_DIR/x/private-assets/" "$RELEASE_DIR/x/private-assets"
  [ -d "$CHECKOUT_DIR/x/api" ] && copy_tree "$CHECKOUT_DIR/x/api/" "$RELEASE_DIR/x/api"
  [ -d "$CHECKOUT_DIR/dist" ] && copy_tree "$CHECKOUT_DIR/dist/" "$RELEASE_DIR/dist"
  [ -d "$CHECKOUT_DIR/public/brand" ] && copy_tree "$CHECKOUT_DIR/public/brand/" "$RELEASE_DIR/public/brand"
  [ -f "$CHECKOUT_DIR/scripts/serve-tiwlo-frontend.mjs" ] && cp "$CHECKOUT_DIR/scripts/serve-tiwlo-frontend.mjs" "$RELEASE_DIR/scripts/serve-tiwlo-frontend.mjs"

  cp "$CHECKOUT_DIR/package.json" "$RELEASE_DIR/package.json"
  [ -f "$CHECKOUT_DIR/package-lock.json" ] && cp "$CHECKOUT_DIR/package-lock.json" "$RELEASE_DIR/package-lock.json"
  cp "$CHECKOUT_DIR/x/package.json" "$RELEASE_DIR/x/package.json"
  [ -f "$CHECKOUT_DIR/x/package-lock.json" ] && cp "$CHECKOUT_DIR/x/package-lock.json" "$RELEASE_DIR/x/package-lock.json"
  [ -d "$CHECKOUT_DIR/node_modules" ] && copy_tree "$CHECKOUT_DIR/node_modules/" "$RELEASE_DIR/node_modules"
  [ -d "$CHECKOUT_DIR/x/node_modules" ] && copy_tree "$CHECKOUT_DIR/x/node_modules/" "$RELEASE_DIR/x/node_modules"

  obfuscate_dir "$RELEASE_DIR/x/src" 0.55
  obfuscate_dir "$RELEASE_DIR/tSecurity" 0.6
  [ -f "$RELEASE_DIR/scripts/serve-tiwlo-frontend.mjs" ] && obfuscate_file "$RELEASE_DIR/scripts/serve-tiwlo-frontend.mjs"
}

install_obfuscated_release() {
  step "Installing obfuscated runtime into production root"
  mkdir -p "$ROOT"
  cp -a "$RELEASE_DIR"/. "$ROOT"/
  mkdir -p "$ROOT/public" "$ROOT/.logs"
  if [ -d "$PRESERVE_DIR/public/uploads" ] && [ ! -e "$ROOT/public/uploads" ]; then
    mkdir -p "$ROOT/public"
    mv "$PRESERVE_DIR/public/uploads" "$ROOT/public/uploads"
  fi
}

stop_readable_source_services() {
  if [ "$STOP_SYSTEMD_BACKEND" = "1" ] && have systemctl; then
    if systemctl list-unit-files tiwlo-backend.service >/dev/null 2>&1; then
      step "Stopping old readable-source backend service"
      run_sudo systemctl stop tiwlo-backend.service >/dev/null 2>&1 || true
    fi
  fi
  if have pm2 && [ "$PM2_APP_NAME" != "tiwlo-backend" ] && pm2 describe tiwlo-backend >/dev/null 2>&1; then
    pm2 delete tiwlo-backend >/dev/null 2>&1 || true
  fi
}

restart_obfuscated_backend() {
  step "Restarting backend from obfuscated code"
  if have pm2; then
    if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
      PORT="$BACKEND_PORT" pm2 restart "$PM2_APP_NAME" --update-env
    else
      PORT="$BACKEND_PORT" pm2 start "$ROOT/x/src/server.js" \
        --name "$PM2_APP_NAME" \
        --cwd "$ROOT/x" \
        --time \
        --interpreter node
    fi
    pm2 save || true
  else
    if have systemctl && systemctl list-unit-files tiwlo-backend.service >/dev/null 2>&1; then
      run_sudo systemctl restart tiwlo-backend.service >/dev/null 2>&1 || true
      return 0
    fi
    local pid_file="$ROOT/.logs/${PM2_APP_NAME}.pid"
    if [ -f "$pid_file" ]; then
      local old_pid
      old_pid="$(cat "$pid_file" 2>/dev/null || true)"
      [ -n "$old_pid" ] && kill "$old_pid" >/dev/null 2>&1 || true
      sleep 2
    fi
    PORT="$BACKEND_PORT" nohup node "$ROOT/x/src/server.js" \
      >"$ROOT/.logs/${PM2_APP_NAME}.out.log" \
      2>"$ROOT/.logs/${PM2_APP_NAME}.err.log" &
    echo "$!" > "$pid_file"
  fi

  if [ "$RESTART_SYSTEMD_FRONTEND" = "1" ] && have systemctl; then
    if systemctl list-unit-files tiwlo-frontend.service >/dev/null 2>&1; then
      run_sudo systemctl restart tiwlo-frontend.service >/dev/null 2>&1 || true
    fi
  fi
}

post_wipe_temporary_source() {
  step "Post-wiping temporary checkout and new .git"
  rm -rf -- "$CHECKOUT_DIR" "$RELEASE_DIR"
  CHECKOUT_DIR=""
  RELEASE_DIR=""
}

main() {
  self_reexec_from_temp "$@"
  assert_safe_root
  resolve_repo_url

  if ! have git || ! have node || ! have npm; then
    echo "git, node, and npm are required on the server." >&2
    exit 1
  fi

  echo "Production root: $ROOT"
  echo "Temporary source only: $TMP_BASE"
  echo "Repository: $REPO_URL"

  install_external_update_command
  hard_wipe_existing_production_code
  clone_fresh_source_to_temp
  install_dependencies_and_build
  ensure_obfuscator
  prepare_obfuscated_release
  install_obfuscated_release
  stop_readable_source_services
  restart_obfuscated_backend
  post_wipe_temporary_source

  step "Secure obfuscated deployment complete"
  echo "Readable source and .git are not kept in $ROOT."
  echo "Backend entry: $ROOT/x/src/server.js"
  echo "PM2 app/fallback name: $PM2_APP_NAME"
}

main "$@"
