#!/usr/bin/env bash
set -euo pipefail

ROOT="${TIWLO_INSTALL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${TIWLO_GIT_BRANCH:-main}"
RUNTIME_DIR="${TIWLO_OBFUSCATED_DIR:-$ROOT/.runtime/tiwlo-obfuscated}"
TOOL_DIR="${TIWLO_OBFUSCATOR_TOOL_DIR:-$ROOT/.tools/javascript-obfuscator}"
PM2_APP_NAME="${TIWLO_PM2_APP_NAME:-tiwlo-backend-obfuscated}"
BACKEND_PORT="${BACKEND_PORT:-4000}"
RUN_DB_PUSH="${TIWLO_RUN_DB_PUSH:-1}"
RUN_FRONTEND_BUILD="${TIWLO_BUILD_FRONTEND:-1}"
RESET_BEFORE_PULL="${TIWLO_RESET_BEFORE_PULL:-0}"
WIPE_READABLE_SOURCE="${TIWLO_WIPE_READABLE_SOURCE:-0}"
STOP_SYSTEMD_BACKEND="${TIWLO_STOP_SYSTEMD_BACKEND:-1}"
OBFUSCATOR_VERSION="${JAVASCRIPT_OBFUSCATOR_VERSION:-4.1.1}"

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

safe_runtime_path() {
  local root_real runtime_real
  root_real="$(realpath "$ROOT")"
  runtime_real="$(realpath_m "$RUNTIME_DIR")"
  case "$runtime_real" in
    "$root_real/.runtime/"*|"$root_real/.deploy/"*) ;;
    *)
      echo "Refusing to use unsafe runtime path: $runtime_real" >&2
      echo "Set TIWLO_OBFUSCATED_DIR under $root_real/.runtime or $root_real/.deploy." >&2
      exit 1
      ;;
  esac
}

copy_tree() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  if have rsync; then
    rsync -a --delete "$src" "$dest"
  else
    rm -rf "$dest"
    cp -a "$src" "$dest"
  fi
}

link_or_copy() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  rm -rf "$dest"
  if ln -s "$src" "$dest" 2>/dev/null; then
    return 0
  fi
  cp -a "$src" "$dest"
}

refresh_code() {
  step "Updating git checkout"
  cd "$ROOT"
  if [ ! -d .git ]; then
    echo "No .git directory found at $ROOT" >&2
    exit 1
  fi
  git fetch origin "$BRANCH" --prune
  if [ "$RESET_BEFORE_PULL" = "1" ] || [ "$WIPE_READABLE_SOURCE" = "1" ]; then
    git reset --hard "origin/$BRANCH"
  else
    git pull --ff-only origin "$BRANCH"
  fi
}

install_dependencies() {
  step "Installing project dependencies"
  if [ -f package-lock.json ]; then
    npm ci || npm install
  else
    npm install
  fi
  if [ -f x/package-lock.json ]; then
    npm --prefix x ci || npm --prefix x install
  else
    npm --prefix x install
  fi

  step "Preparing Prisma"
  npm --prefix x run db:generate
  if [ "$RUN_DB_PUSH" = "1" ]; then
    npm --prefix x run db:push
  fi

  if [ "$RUN_FRONTEND_BUILD" = "1" ]; then
    step "Building frontend"
    npm run build
  fi
}

ensure_obfuscator() {
  if have javascript-obfuscator; then
    OBFUSCATOR_BIN="$(command -v javascript-obfuscator)"
    return 0
  fi

  step "Installing javascript-obfuscator locally for production deploy"
  mkdir -p "$TOOL_DIR"
  if [ ! -f "$TOOL_DIR/package.json" ]; then
    (cd "$TOOL_DIR" && npm init -y >/dev/null)
  fi
  npm --prefix "$TOOL_DIR" install "javascript-obfuscator@$OBFUSCATOR_VERSION" --omit=dev
  OBFUSCATOR_BIN="$TOOL_DIR/node_modules/.bin/javascript-obfuscator"
}

stop_existing_backend_service() {
  if [ "$STOP_SYSTEMD_BACKEND" != "1" ] || ! have systemctl; then
    return 0
  fi
  if systemctl list-unit-files tiwlo-backend.service >/dev/null 2>&1; then
    step "Stopping readable-source systemd backend service"
    run_sudo systemctl stop tiwlo-backend.service >/dev/null 2>&1 || true
  fi
}

prepare_runtime_tree() {
  safe_runtime_path
  local tmp_dir previous_dir
  tmp_dir="${RUNTIME_DIR}.tmp"
  previous_dir="${RUNTIME_DIR}.previous"

  step "Creating obfuscated runtime tree"
  rm -rf "$tmp_dir" "$previous_dir"
  mkdir -p "$tmp_dir/x" "$tmp_dir/public" "$tmp_dir/.logs"

  copy_tree "$ROOT/x/src/" "$tmp_dir/x/src"
  copy_tree "$ROOT/x/graphql/" "$tmp_dir/x/graphql"
  [ -d "$ROOT/x/private-assets" ] && copy_tree "$ROOT/x/private-assets/" "$tmp_dir/x/private-assets"
  [ -d "$ROOT/x/api" ] && copy_tree "$ROOT/x/api/" "$tmp_dir/x/api"
  copy_tree "$ROOT/tSecurity/" "$tmp_dir/tSecurity"

  cp "$ROOT/x/package.json" "$tmp_dir/x/package.json"
  [ -f "$ROOT/x/package-lock.json" ] && cp "$ROOT/x/package-lock.json" "$tmp_dir/x/package-lock.json"
  [ -f "$ROOT/x/prisma.config.ts" ] && cp "$ROOT/x/prisma.config.ts" "$tmp_dir/x/prisma.config.ts"
  [ -d "$ROOT/x/prisma" ] && copy_tree "$ROOT/x/prisma/" "$tmp_dir/x/prisma"

  [ -d "$ROOT/public/brand" ] && copy_tree "$ROOT/public/brand/" "$tmp_dir/public/brand"
  [ -d "$ROOT/public/uploads" ] && link_or_copy "$ROOT/public/uploads" "$tmp_dir/public/uploads"
  [ -d "$ROOT/.data" ] && link_or_copy "$ROOT/.data" "$tmp_dir/.data"
  [ -d "$ROOT/.logs" ] && link_or_copy "$ROOT/.logs" "$tmp_dir/.logs"
  [ -d "$ROOT/.tools" ] && link_or_copy "$ROOT/.tools" "$tmp_dir/.tools"
  [ -f "$ROOT/.env" ] && link_or_copy "$ROOT/.env" "$tmp_dir/.env"
  [ -f "$ROOT/x/.env" ] && link_or_copy "$ROOT/x/.env" "$tmp_dir/x/.env"
  [ -d "$ROOT/node_modules" ] && link_or_copy "$ROOT/node_modules" "$tmp_dir/node_modules"
  [ -d "$ROOT/x/node_modules" ] && link_or_copy "$ROOT/x/node_modules" "$tmp_dir/x/node_modules"

  step "Obfuscating backend source"
  "$OBFUSCATOR_BIN" "$tmp_dir/x/src" --output "$tmp_dir/x/src" \
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
    --string-array-threshold 0.55 \
    --rotate-string-array true \
    --shuffle-string-array true \
    --split-strings false \
    --transform-object-keys false \
    --numbers-to-expressions false \
    --source-map false

  "$OBFUSCATOR_BIN" "$tmp_dir/tSecurity" --output "$tmp_dir/tSecurity" \
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
    --string-array-threshold 0.6 \
    --rotate-string-array true \
    --shuffle-string-array true \
    --split-strings false \
    --transform-object-keys false \
    --numbers-to-expressions false \
    --source-map false

  if [ -d "$RUNTIME_DIR" ]; then
    mv "$RUNTIME_DIR" "$previous_dir"
  fi
  mv "$tmp_dir" "$RUNTIME_DIR"
  rm -rf "$previous_dir"
}

restart_backend() {
  step "Restarting backend from obfuscated runtime"
  if have pm2; then
    if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
      PORT="$BACKEND_PORT" pm2 restart "$PM2_APP_NAME" --update-env
    else
      PORT="$BACKEND_PORT" pm2 start "$RUNTIME_DIR/x/src/server.js" \
        --name "$PM2_APP_NAME" \
        --cwd "$RUNTIME_DIR/x" \
        --time \
        --interpreter node
    fi
    pm2 save || true
    return 0
  fi

  mkdir -p "$ROOT/.logs"
  local pid_file="$ROOT/.logs/${PM2_APP_NAME}.pid"
  if [ -f "$pid_file" ]; then
    local old_pid
    old_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
      kill "$old_pid" || true
      sleep 2
    fi
  fi
  PORT="$BACKEND_PORT" nohup node "$RUNTIME_DIR/x/src/server.js" \
    >"$ROOT/.logs/${PM2_APP_NAME}.out.log" \
    2>"$ROOT/.logs/${PM2_APP_NAME}.err.log" &
  echo "$!" > "$pid_file"
}

wipe_readable_source() {
  if [ "$WIPE_READABLE_SOURCE" != "1" ]; then
    return 0
  fi
  step "Wiping readable source folders from checkout"
  echo "Next deploy will restore them with: git reset --hard origin/$BRANCH"
  rm -rf "$ROOT/x/src" "$ROOT/tSecurity" "$ROOT/src"
}

main() {
  if ! have node || ! have npm; then
    echo "Node.js and npm are required before running this deploy script." >&2
    exit 1
  fi
  refresh_code
  install_dependencies
  ensure_obfuscator
  prepare_runtime_tree
  stop_existing_backend_service
  restart_backend
  wipe_readable_source
  step "Obfuscated deploy complete"
  echo "Runtime: $RUNTIME_DIR"
  echo "Backend entry: $RUNTIME_DIR/x/src/server.js"
  echo "PM2 app/fallback name: $PM2_APP_NAME"
}

main "$@"
