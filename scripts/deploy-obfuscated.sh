#!/usr/bin/env bash
set -euo pipefail

DEPLOY_SCRIPT_VERSION="2026-07-19-low-disk-safe-social-ai-release"
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
CUSTOM_TMP_BASE="${TIWLO_DEPLOY_TMP_BASE:-}"
TOOL_DIR="${TIWLO_OBFUSCATOR_TOOL_DIR:-$ROOT/.tools/javascript-obfuscator}"
INSTALL_UPDATE_COMMAND="${TIWLO_INSTALL_UPDATE_COMMAND:-1}"
UPDATE_COMMAND_PATH="${TIWLO_UPDATE_COMMAND_PATH:-/usr/local/bin/tiwlo-secure-update}"
DEPLOY_SWAP_MB="${TIWLO_DEPLOY_SWAP_MB:-4096}"
DEPLOY_SWAP_FILE="${TIWLO_DEPLOY_SWAP_FILE:-}"
DEPLOY_DISK_RESERVE_MB="${TIWLO_DEPLOY_DISK_RESERVE_MB:-1536}"
KEEP_DEPLOY_SWAP="${TIWLO_KEEP_DEPLOY_SWAP:-0}"
NPM_CACHE_DIR="${TIWLO_NPM_CACHE_DIR:-}"
NODE_OLD_SPACE_MB="${TIWLO_NODE_OLD_SPACE_MB:-1024}"
INSTALL_AI_MODEL_RUNTIME="${TIWLO_INSTALL_AI_MODEL_RUNTIME:-0}"
INSTALL_SOCIAL_AI_INFRASTRUCTURE="${TIWLO_INSTALL_SOCIAL_AI_INFRASTRUCTURE:-1}"

CHECKOUT_DIR=""
RELEASE_DIR=""
PRESERVE_DIR=""
SELF_COPY="${TIWLO_DEPLOY_SELF_COPY:-}"
OBFUSCATOR_BIN=""
DEPLOY_SWAP_CREATED="0"
NPM_CACHE_CREATED="0"
PRESERVE_RESTORED="0"

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
  if [ -n "$PRESERVE_DIR" ]; then
    if [ "$PRESERVE_RESTORED" = "1" ] || [ -z "$(find "$PRESERVE_DIR" -mindepth 1 -print -quit 2>/dev/null)" ]; then
      rm -rf -- "$PRESERVE_DIR"
    else
      echo "Preserved runtime data was left at $PRESERVE_DIR because deploy stopped before restore." >&2
    fi
  fi
  [ -n "$SELF_COPY" ] && rm -f -- "$SELF_COPY"
  if [ "$DEPLOY_SWAP_CREATED" = "1" ] && [ "$KEEP_DEPLOY_SWAP" != "1" ]; then
    [ -n "$DEPLOY_SWAP_FILE" ] && run_sudo swapoff "$DEPLOY_SWAP_FILE" >/dev/null 2>&1 || true
    [ -n "$DEPLOY_SWAP_FILE" ] && run_sudo rm -f "$DEPLOY_SWAP_FILE" >/dev/null 2>&1 || true
  fi
  if [ "$NPM_CACHE_CREATED" = "1" ] && [ -n "$NPM_CACHE_DIR" ]; then
    rm -rf -- "$NPM_CACHE_DIR"
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

resolve_deploy_paths() {
  if [ -z "$CUSTOM_TMP_BASE" ]; then
    TMP_BASE="$(realpath_m "$(dirname "$ROOT")/.tiwlo-tmp")"
  else
    TMP_BASE="$(realpath_m "$TMP_BASE")"
  fi
  mkdir -p "$TMP_BASE"

  if [ -z "$DEPLOY_SWAP_FILE" ]; then
    DEPLOY_SWAP_FILE="$(realpath_m "$(dirname "$ROOT")/.tiwlo-deploy.swap")"
  else
    DEPLOY_SWAP_FILE="$(realpath_m "$DEPLOY_SWAP_FILE")"
  fi
}

install_external_update_command() {
  if [ "$INSTALL_UPDATE_COMMAND" != "1" ]; then
    return 0
  fi
  step "Installing external secure update command"
  local launcher
  launcher="$(mktemp "$TMP_BASE/tiwlo-secure-update.XXXXXX")"
  cat >"$launcher" <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

ROOT="${TIWLO_INSTALL_DIR:-/var/www/Tiwlo}"
BRANCH="${TIWLO_GIT_BRANCH:-main}"
REPO_URL="${TIWLO_REPO_URL:-https://github.com/alimranniloy/Tiwlo.git}"
ROOT="$(realpath -m "$ROOT")"
TMP_BASE="${TIWLO_DEPLOY_TMP_BASE:-$(dirname "$ROOT")/.tiwlo-tmp}"
DEPLOY_SWAP_FILE="${TIWLO_DEPLOY_SWAP_FILE:-$(dirname "$ROOT")/.tiwlo-deploy.swap}"
DEPLOY_SWAP_MB="${TIWLO_DEPLOY_SWAP_MB:-4096}"
mkdir -p "$TMP_BASE"

cleanup_legacy_artifacts() {
  local legacy_swap="$ROOT/.data/tiwlo-deploy.swap"
  if [ -f "$legacy_swap" ]; then
    swapoff "$legacy_swap" >/dev/null 2>&1 || true
    rm -f "$legacy_swap" >/dev/null 2>&1 || true
  fi
  find /tmp -path '*/tiwlo-deploy.swap' -type f -exec rm -f -- {} + >/dev/null 2>&1 || true
  find /tmp -maxdepth 1 -type d \( -name 'tiwlo-src.*' -o -name 'tiwlo-release.*' -o -name 'tiwlo-npm-cache.*' \) -exec rm -rf -- {} + >/dev/null 2>&1 || true
}

fetch_latest_deploy_script() {
  local script
  local url
  script="$(mktemp "$TMP_BASE/tiwlo-secure-deploy.XXXXXX.sh")"
  url="https://raw.githubusercontent.com/alimranniloy/Tiwlo/${BRANCH}/scripts/deploy-obfuscated.sh?fresh=$(date +%s)"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -H 'Cache-Control: no-cache' "$url" -o "$script"
  elif command -v wget >/dev/null 2>&1; then
    wget --no-cache -qO "$script" "$url"
  else
    echo "curl or wget is required to fetch the secure deploy script." >&2
    exit 1
  fi
  chmod 700 "$script"
  printf '%s\n' "$script"
}

cleanup_legacy_artifacts
deploy_script="$(fetch_latest_deploy_script)"
export TIWLO_INSTALL_DIR="$ROOT"
export TIWLO_REPO_URL="$REPO_URL"
export TIWLO_DEPLOY_TMP_BASE="$TMP_BASE"
export TIWLO_DEPLOY_SWAP_FILE="$DEPLOY_SWAP_FILE"
export TIWLO_DEPLOY_SWAP_MB="$DEPLOY_SWAP_MB"
export TIWLO_DEPLOY_SELF_REEXEC=1
export TIWLO_DEPLOY_SELF_COPY="$deploy_script"
exec bash "$deploy_script"
BASH

  if run_sudo mkdir -p "$(dirname "$UPDATE_COMMAND_PATH")" >/dev/null 2>&1 \
    && run_sudo cp "$launcher" "$UPDATE_COMMAND_PATH" >/dev/null 2>&1 \
    && run_sudo chmod 700 "$UPDATE_COMMAND_PATH" >/dev/null 2>&1; then
    echo "Future updates: sudo TIWLO_INSTALL_DIR=$ROOT $UPDATE_COMMAND_PATH"
  else
    echo "Could not install $UPDATE_COMMAND_PATH; use the GitHub raw script command for future updates." >&2
  fi
  rm -f "$launcher"
}

current_swap_mb() {
  if [ -r /proc/meminfo ]; then
    awk '/^SwapTotal:/ { print int($2 / 1024) }' /proc/meminfo
  else
    echo 0
  fi
}

swap_path_is_active() {
  local path="$1"
  [ -r /proc/swaps ] && awk -v path="$path" 'NR > 1 && $1 == path { found = 1 } END { exit found ? 0 : 1 }' /proc/swaps
}

swap_file_is_active() {
  swap_path_is_active "$DEPLOY_SWAP_FILE"
}

file_size_mb() {
  if [ -f "$1" ]; then
    du -m "$1" 2>/dev/null | awk '{ print int($1) }'
  else
    echo 0
  fi
}

available_filesystem_mb() {
  df -Pm "$(dirname "$DEPLOY_SWAP_FILE")" 2>/dev/null | awk 'NR == 2 { print int($4); exit }'
}

ensure_deploy_swap() {
  local requested="${DEPLOY_SWAP_MB:-0}" available="0" max_safe="0" target="0"
  if [ "$(uname -s)" != "Linux" ] || [ "${DEPLOY_SWAP_MB:-0}" = "0" ]; then
    return 0
  fi
  if [ "$(current_swap_mb)" -ge "$requested" ]; then
    echo "Existing swap meets deploy target: $(current_swap_mb)MB >= ${requested}MB"
    return 0
  fi

  # A deployment must never consume the final disk space needed for its own
  # checkout, model state and atomic release move. On small VPS plans the
  # temporary swap target is reduced (or safely skipped) instead of failing
  # the release with ENOSPC.
  available="$(available_filesystem_mb || echo 0)"
  if ! [[ "$available" =~ ^[0-9]+$ ]]; then available=0; fi
  max_safe=$((available - DEPLOY_DISK_RESERVE_MB))
  if [ "$max_safe" -lt 512 ]; then
    echo "Skipping temporary deploy swap: only ${available}MB is free; reserving ${DEPLOY_DISK_RESERVE_MB}MB for the release."
    return 0
  fi
  target="$requested"
  if [ "$target" -gt "$max_safe" ]; then
    target="$max_safe"
    echo "Reducing temporary deploy swap from ${requested}MB to ${target}MB to preserve release disk space."
  fi

  step "Ensuring deploy swap (${target}MB target) to prevent npm OOM kills"
  mkdir -p "$(dirname "$DEPLOY_SWAP_FILE")"
  if swap_file_is_active && [ "$(file_size_mb "$DEPLOY_SWAP_FILE")" -lt "$target" ]; then
    echo "Keeping the existing active deploy swap rather than risking memory pressure while resizing it."
    return 0
  fi
  if [ "$(file_size_mb "$DEPLOY_SWAP_FILE")" -lt "$target" ]; then
    run_sudo rm -f "$DEPLOY_SWAP_FILE"
    if have fallocate; then
      if ! run_sudo fallocate -l "${target}M" "$DEPLOY_SWAP_FILE"; then
        echo "Could not allocate temporary deploy swap; continuing without a new swap file." >&2
        return 0
      fi
    else
      if ! run_sudo dd if=/dev/zero of="$DEPLOY_SWAP_FILE" bs=1M count="$target" status=none; then
        echo "Could not allocate temporary deploy swap; continuing without a new swap file." >&2
        return 0
      fi
    fi
  fi
  if swap_file_is_active; then run_sudo swapoff "$DEPLOY_SWAP_FILE" >/dev/null 2>&1 || true; fi
  run_sudo chmod 600 "$DEPLOY_SWAP_FILE"
  if ! run_sudo mkswap "$DEPLOY_SWAP_FILE" >/dev/null || ! run_sudo swapon "$DEPLOY_SWAP_FILE"; then
    echo "Could not activate temporary deploy swap; continuing without a new swap file." >&2
    return 0
  fi
  DEPLOY_SWAP_CREATED="1"
  echo "Deploy swap active: $(current_swap_mb)MB total"
}

prepare_low_memory_node_env() {
  if [ -z "$NPM_CACHE_DIR" ]; then
    NPM_CACHE_DIR="$(mktemp -d "$TMP_BASE/tiwlo-npm-cache.XXXXXX")"
    NPM_CACHE_CREATED="1"
  fi
  mkdir -p "$NPM_CACHE_DIR"
  export npm_config_cache="$NPM_CACHE_DIR"
  export npm_config_audit=false
  export npm_config_fund=false
  export npm_config_progress=false
  export npm_config_prefer_online=true
  export npm_config_update_notifier=false
  export npm_config_maxsockets=1
  export MAKEFLAGS="-j1"
  export CMAKE_BUILD_PARALLEL_LEVEL=1
  export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=$NODE_OLD_SPACE_MB"
}

disable_backend_ai_runtime_for_low_memory() {
  if [ "$INSTALL_AI_MODEL_RUNTIME" = "1" ]; then
    return 0
  fi
  if [ ! -f "$CHECKOUT_DIR/x/package.json" ]; then
    return 0
  fi

  step "Skipping heavy local AI runtime package for small-VPS deploy"
  node <<'NODE'
const fs = require('fs');
const path = require('path');

const backendDir = path.join(process.cwd(), 'x');
const removeLlamaRuntime = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.dependencies) delete data.dependencies['node-llama-cpp'];
  if (data.optionalDependencies) delete data.optionalDependencies['node-llama-cpp'];
  if (data.packages) {
    for (const key of Object.keys(data.packages)) {
      if (key.includes('node_modules/node-llama-cpp') || key.includes('node_modules/@node-llama-cpp')) {
        delete data.packages[key];
      }
    }
    if (data.packages['']?.dependencies) {
      delete data.packages[''].dependencies['node-llama-cpp'];
    }
    if (data.packages['']?.optionalDependencies) {
      delete data.packages[''].optionalDependencies['node-llama-cpp'];
    }
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

removeLlamaRuntime(path.join(backendDir, 'package.json'));
removeLlamaRuntime(path.join(backendDir, 'package-lock.json'));
NODE
}

validate_node_modules_package_jsons() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  node - "$dir" <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const ignored = new Set(['.bin']);
const stack = [root];

while (stack.length) {
  const current = stack.pop();
  let entries = [];
  try {
    entries = fs.readdirSync(current, { withFileTypes: true });
  } catch {
    continue;
  }

  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) stack.push(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name === 'package.json') {
      try {
        JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      } catch (error) {
        console.error(`Invalid package.json: ${fullPath}`);
        console.error(error.message);
        process.exit(1);
      }
    }
  }
}
NODE
}

clean_npm_cache_for_retry() {
  step "Cleaning temporary npm cache before retry"
  npm cache clean --force >/dev/null 2>&1 || true
  rm -rf -- "$NPM_CACHE_DIR"
  mkdir -p "$NPM_CACHE_DIR"
}

npm_install_with_retry() {
  local label="$1"
  local modules_dir="$2"
  shift 2
  local attempt=1

  while [ "$attempt" -le 2 ]; do
    if "$@" && validate_node_modules_package_jsons "$modules_dir"; then
      return 0
    fi
    if [ "$attempt" -ge 2 ]; then
      echo "$label dependency install produced an invalid node_modules tree after retry." >&2
      return 1
    fi
    step "$label dependency tree was incomplete; retrying from a clean cache"
    rm -rf -- "$modules_dir"
    clean_npm_cache_for_retry
    attempt=$((attempt + 1))
  done
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

make_preserve_dir() {
  local preserve_parent
  preserve_parent="$(dirname "$ROOT")"
  PRESERVE_DIR="$(mktemp -d "$preserve_parent/.tiwlo-preserve.XXXXXX")"
  PRESERVE_RESTORED="0"
}

remove_swap_path_if_possible() {
  local path="$1"
  if [ -z "$path" ] || [ ! -f "$path" ]; then
    return 0
  fi
  if swap_path_is_active "$path"; then
    if ! run_sudo swapoff "$path" >/dev/null 2>&1; then
      echo "Could not swapoff $path; keeping it in place." >&2
      return 0
    fi
  fi
  run_sudo rm -f "$path" >/dev/null 2>&1 || true
}

drop_legacy_deploy_swap_before_preserve() {
  local legacy_swap="$ROOT/.data/tiwlo-deploy.swap"
  if [ "$legacy_swap" != "$DEPLOY_SWAP_FILE" ]; then
    remove_swap_path_if_possible "$legacy_swap"
  fi
}

random_secret() {
  openssl rand -hex 32 2>/dev/null || date +%s%N
}

read_env_value() {
  local file="$1"
  local key="$2"
  if [ ! -f "$file" ]; then
    return 0
  fi
  grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1 | sed -E "s/^[^=]+=//; s/^\"//; s/\"$//; s/^'//; s/'$//"
}

env_has_value() {
  local file="$1"
  local key="$2"
  [ -f "$file" ] && grep -Eq "^[[:space:]]*${key}=[\"']?.+" "$file"
}

set_env_value_if_missing() {
  local file="$1"
  local key="$2"
  local value="$3"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  if ! env_has_value "$file" "$key"; then
    printf '%s="%s"\n' "$key" "$value" >> "$file"
  fi
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  mkdir -p "$(dirname "$file")"
  touch "$file"
  tmp="$(mktemp "$TMP_BASE/tiwlo-env.XXXXXX")"
  if grep -qE "^[[:space:]]*${key}=" "$file"; then
    awk -v key="$key" -v value="$value" '
      BEGIN { line = key "=\"" value "\"" }
      $0 ~ "^[[:space:]]*" key "=" { print line; next }
      { print }
    ' "$file" > "$tmp"
  else
    cp "$file" "$tmp"
    printf '%s="%s"\n' "$key" "$value" >> "$tmp"
  fi
  mv "$tmp" "$file"
}

ensure_runtime_env_files() {
  local backend_env="$ROOT/x/.env"
  local root_env="$ROOT/.env"
  local database_url
  local frontend_origin
  local api_base_url

  database_url="${DATABASE_URL:-${TIWLO_DATABASE_URL:-}}"
  database_url="${database_url:-$(read_env_value "$backend_env" DATABASE_URL)}"
  database_url="${database_url:-$(read_env_value "$root_env" DATABASE_URL)}"
  database_url="${database_url:-postgresql://postgres:postgres@127.0.0.1:5432/tiwlo?schema=public}"

  frontend_origin="${FRONTEND_ORIGIN:-$(read_env_value "$backend_env" FRONTEND_ORIGIN)}"
  frontend_origin="${frontend_origin:-$(read_env_value "$root_env" APP_URL)}"
  frontend_origin="${frontend_origin:-http://127.0.0.1:${FRONTEND_PORT}}"
  api_base_url="${API_BASE_URL:-$(read_env_value "$backend_env" API_BASE_URL)}"
  api_base_url="${api_base_url:-$frontend_origin}"

  if ! env_has_value "$backend_env" DATABASE_URL; then
    step "Recreating missing backend environment file"
  fi
  set_env_value_if_missing "$root_env" VITE_GRAPHQL_URL "${FRONTEND_GRAPHQL_URL:-/graphql}"
  set_env_value_if_missing "$root_env" APP_URL "$frontend_origin"
  set_env_value_if_missing "$backend_env" DATABASE_URL "$database_url"
  set_env_value_if_missing "$backend_env" JWT_SECRET "${JWT_SECRET:-$(random_secret)}"
  set_env_value_if_missing "$backend_env" PORT "$BACKEND_PORT"
  set_env_value_if_missing "$backend_env" FRONTEND_ORIGIN "$frontend_origin"
  set_env_value_if_missing "$backend_env" API_BASE_URL "$api_base_url"
  # Social AI is a hosted Gemini integration. Keep its protected runtime
  # configuration outside Git and copy any root-level update into the backend
  # environment used by systemd after each clean deployment.
  local social_ai_key
  for social_ai_key in SOCIAL_GEMINI_API_KEY SOCIAL_GEMINI_MODEL SOCIAL_GEMINI_API_BASE_URL SOCIAL_GEMINI_TIMEOUT_MS; do
    local social_ai_value
    social_ai_value="$(read_env_value "$root_env" "$social_ai_key")"
    [ -n "$social_ai_value" ] && set_env_value "$backend_env" "$social_ai_key" "$social_ai_value"
  done
}

merge_backend_env_from_preserve() {
  local source="$1"
  local target="$ROOT/x/.env"
  local source_db
  local target_db
  local value
  local key
  local default_db="postgresql://postgres:postgres@127.0.0.1:5432/tiwlo?schema=public"

  [ -f "$source" ] || return 0
  source_db="$(read_env_value "$source" DATABASE_URL)"
  target_db="$(read_env_value "$target" DATABASE_URL)"
  if [ -n "$source_db" ] && { [ -z "$target_db" ] || [ "$target_db" = "$default_db" ]; }; then
    set_env_value "$target" DATABASE_URL "$source_db"
    echo "Recovered DATABASE_URL from preserved backend env"
  fi
  for key in JWT_SECRET FRONTEND_ORIGIN API_BASE_URL SMTP_HOST SMTP_PUBLIC_HOST SMTP_TLS_SERVERNAME SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS MAIL_FROM MAIL_FROM_NAME MAIL_REPLY_TO; do
    value="$(read_env_value "$source" "$key")"
    [ -n "$value" ] && set_env_value_if_missing "$target" "$key" "$value"
  done
}

restore_stranded_preserve_path() {
  local preserve_dir="$1"
  local label="$2"
  local relative="$3"
  local source="$preserve_dir/$label"
  local target="$ROOT/$relative"

  if [ ! -e "$source" ] && [ ! -L "$source" ]; then
    return 0
  fi
  if [ "$label" = "x.env" ]; then
    merge_backend_env_from_preserve "$source"
  fi
  if [ -e "$target" ] || [ -L "$target" ]; then
    return 0
  fi
  if [ "$label" = "data" ]; then
    remove_swap_path_if_possible "$source/tiwlo-deploy.swap"
  fi

  mkdir -p "$ROOT/$(dirname "$relative")"
  mv "$source" "$target"
  echo "Recovered $relative from $preserve_dir"
}

recover_stranded_preserve_dirs() {
  local candidate
  for candidate in /tmp/tiwlo-preserve.* "$(dirname "$ROOT")"/.tiwlo-preserve.*; do
    [ -d "$candidate" ] || continue
    step "Checking stranded preserve folder: $candidate"
    restore_stranded_preserve_path "$candidate" "root.env" ".env"
    restore_stranded_preserve_path "$candidate" "x.env" "x/.env"
    restore_stranded_preserve_path "$candidate" "public/uploads" "public/uploads"
    restore_stranded_preserve_path "$candidate" "data" ".data"
    restore_stranded_preserve_path "$candidate" "logs" ".logs"
    restore_stranded_preserve_path "$candidate" "tools" ".tools"
    if [ -z "$(find "$candidate" -mindepth 1 -print -quit 2>/dev/null)" ]; then
      rm -rf -- "$candidate"
    else
      echo "Left non-empty preserve folder in place: $candidate"
    fi
  done
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
  make_preserve_dir
  drop_legacy_deploy_swap_before_preserve

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
  PRESERVE_RESTORED="1"
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

load_backend_env_for_prisma() {
  local backend_env="$CHECKOUT_DIR/x/.env"
  local database_url
  database_url="${DATABASE_URL:-$(read_env_value "$backend_env" DATABASE_URL)}"
  if [ -z "$database_url" ]; then
    echo "DATABASE_URL is missing from $backend_env; Prisma was not run and database was not touched." >&2
    exit 1
  fi
  export DATABASE_URL="$database_url"
}

ensure_rollup_native_optional_dependency() {
  local rollup_pkg
  rollup_pkg="$(node <<'NODE'
const { arch, platform, report } = process;

const linuxLibc = () => {
  if (platform !== 'linux') return '';
  const glibc = report?.getReport?.().header?.glibcVersionRuntime;
  return glibc ? 'gnu' : 'musl';
};

const names = {
  'linux:x64:gnu': '@rollup/rollup-linux-x64-gnu',
  'linux:x64:musl': '@rollup/rollup-linux-x64-musl',
  'linux:arm64:gnu': '@rollup/rollup-linux-arm64-gnu',
  'linux:arm64:musl': '@rollup/rollup-linux-arm64-musl',
  'linux:arm:gnueabihf': '@rollup/rollup-linux-arm-gnueabihf',
  'linux:arm:musleabihf': '@rollup/rollup-linux-arm-musleabihf'
};

const libc = arch === 'arm' ? linuxLibc().replace('gnu', 'gnueabihf').replace('musl', 'musleabihf') : linuxLibc();
const pkg = names[`${platform}:${arch}:${libc}`];
if (!pkg) process.exit(0);

try {
  require.resolve(pkg, { paths: [process.cwd()] });
} catch {
  console.log(pkg);
}
NODE
)"
  if [ -n "$rollup_pkg" ]; then
    step "Installing missing Rollup native package: $rollup_pkg"
    npm install --no-save --no-audit --no-fund --progress=false "$rollup_pkg"
  fi
}

install_dependencies_and_build() {
  ensure_deploy_swap
  prepare_low_memory_node_env

  # Decoded-audio fingerprints are the primary copyright matcher. The app has
  # an exact-file fallback, but fpcalc is required to survive metadata edits.
  if ! have fpcalc; then
    if have apt-get; then
      step "Installing Chromaprint runtime for Social Copyright Studio"
      # Debian/Ubuntu package names differ: current Ubuntu releases expose
      # fpcalc via libchromaprint-tools, while some older images use
      # chromaprint-tools. Try the current name first and retain compatibility.
      chromaprint_installed=0
      if run_sudo apt-get update; then
        for chromaprint_package in libchromaprint-tools chromaprint-tools; do
          if run_sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "$chromaprint_package"; then
            chromaprint_installed=1
            break
          fi
        done
      fi
      if [ "$chromaprint_installed" -ne 1 ]; then
        echo "Could not install fpcalc; copyright will use exact-file matching for this deploy." >&2
      fi
    else
      echo "fpcalc is unavailable; copyright will use exact-file matching until Chromaprint is installed." >&2
    fi
  fi
  if have fpcalc; then
    echo "Chromaprint runtime: $(fpcalc -version 2>&1 | head -n 1)"
  else
    echo "Warning: fpcalc is still unavailable; only identical-file copyright matches are active." >&2
  fi

  step "Installing dependencies inside temporary checkout"
  cd "$CHECKOUT_DIR"
  disable_backend_ai_runtime_for_low_memory

  # Frontend tooling is only needed to build dist. Complete that work and
  # release its dependency tree before the backend install starts; otherwise a
  # small VPS briefly holds two complete node_modules trees plus npm cache.
  if [ "$RUN_FRONTEND_BUILD" = "1" ]; then
    step "Installing frontend build dependencies"
    if [ -f package-lock.json ]; then
      npm_install_with_retry "Frontend" "$CHECKOUT_DIR/node_modules" npm ci --no-audit --no-fund --progress=false \
        || npm_install_with_retry "Frontend" "$CHECKOUT_DIR/node_modules" npm install --no-audit --no-fund --progress=false
    else
      npm_install_with_retry "Frontend" "$CHECKOUT_DIR/node_modules" npm install --no-audit --no-fund --progress=false
    fi
    step "Building frontend in temporary checkout"
    ensure_rollup_native_optional_dependency
    npm run build
    rm -rf -- "$CHECKOUT_DIR/node_modules"
    clean_npm_cache_for_retry
  else
    echo "Skipping frontend build and its full development dependency tree."
  fi

  step "Installing backend runtime dependencies"
  if [ -f x/package-lock.json ]; then
    npm_install_with_retry "Backend" "$CHECKOUT_DIR/x/node_modules" npm --prefix x ci --include=optional --no-audit --no-fund --progress=false \
      || npm_install_with_retry "Backend" "$CHECKOUT_DIR/x/node_modules" npm --prefix x install --include=optional --no-audit --no-fund --progress=false
  else
    npm_install_with_retry "Backend" "$CHECKOUT_DIR/x/node_modules" npm --prefix x install --include=optional --no-audit --no-fund --progress=false
  fi

  step "Verifying backend native media runtime"
  (
    cd "$CHECKOUT_DIR/x"
    node --input-type=module <<'NODE'
const sharp = (await import('sharp')).default;
await sharp({
  create: { width: 2, height: 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
}).png().toBuffer();
await import('./src/modules/social/moderation.js');
console.log('Backend media runtime is ready.');
NODE
  )

  step "Preparing Prisma from temporary checkout"
  load_backend_env_for_prisma
  npm --prefix x run db:generate
  if [ "$RUN_DB_PUSH" = "1" ]; then
    npm --prefix x run db:push
  fi

  # The full frontend build dependency tree has already been removed above.
  # The release later installs only the two runtime frontend dependencies.
}

ensure_obfuscator() {
  step "Installing pinned javascript-obfuscator outside readable source"
  mkdir -p "$TOOL_DIR"
  if [ ! -f "$TOOL_DIR/package.json" ]; then
    (cd "$TOOL_DIR" && npm init -y >/dev/null)
  fi
  npm --prefix "$TOOL_DIR" install "javascript-obfuscator@$OBFUSCATOR_VERSION" --omit=dev --no-audit --no-fund --progress=false
  OBFUSCATOR_BIN="$TOOL_DIR/node_modules/.bin/javascript-obfuscator"
  "$OBFUSCATOR_BIN" --version >/dev/null
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
    --string-array-rotate true \
    --string-array-shuffle true \
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

patch_release_frontend_server_script() {
  node <<'NODE'
const fs = require('fs');
const packagePath = 'package.json';
if (!fs.existsSync(packagePath)) process.exit(0);
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.scripts = pkg.scripts || {};
for (const key of ['serve', 'start']) {
  if (pkg.scripts[key] && pkg.scripts[key].includes('scripts/serve-tiwlo-frontend.mjs')) {
    pkg.scripts[key] = pkg.scripts[key].replace('scripts/serve-tiwlo-frontend.mjs', 'scripts/serve-tiwlo-frontend.js');
  }
}
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
NODE
}

write_frontend_runtime_manifest() {
  node - "$CHECKOUT_DIR/package.json" "$RELEASE_DIR/package.json" <<'NODE'
const fs = require('fs');
const [sourcePath, targetPath] = process.argv.slice(2);
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const required = ['express', 'compression'];
const dependencies = {};
for (const name of required) {
  const version = source.dependencies?.[name];
  if (!version) throw new Error(`Frontend runtime dependency is missing: ${name}`);
  dependencies[name] = version;
}
const runtime = {
  name: source.name || 'tiwlo-frontend-runtime',
  private: true,
  version: source.version || '1.0.0',
  type: 'module',
  engines: source.engines,
  scripts: {
    serve: 'node scripts/serve-tiwlo-frontend.js',
    start: 'node scripts/serve-tiwlo-frontend.js'
  },
  dependencies
};
fs.writeFileSync(targetPath, `${JSON.stringify(runtime, null, 2)}\n`);
NODE
}

install_frontend_runtime_dependencies() {
  step "Installing lean frontend runtime dependencies"
  (
    cd "$RELEASE_DIR"
    npm install --omit=dev --package-lock=false --ignore-scripts --no-audit --no-fund --progress=false
  )
  validate_node_modules_package_jsons "$RELEASE_DIR/node_modules"
}

prepare_obfuscated_release() {
  step "Preparing final obfuscated runtime release"
  RELEASE_DIR="$(mktemp -d "$TMP_BASE/tiwlo-release.XXXXXX")"

  mkdir -p "$RELEASE_DIR/x" "$RELEASE_DIR/public" "$RELEASE_DIR/scripts" "$RELEASE_DIR/packages"
  copy_tree "$CHECKOUT_DIR/x/src/" "$RELEASE_DIR/x/src"
  copy_tree "$CHECKOUT_DIR/tSecurity/" "$RELEASE_DIR/tSecurity"
  copy_tree "$CHECKOUT_DIR/x/graphql/" "$RELEASE_DIR/x/graphql"
  [ -d "$CHECKOUT_DIR/x/private-assets" ] && copy_tree "$CHECKOUT_DIR/x/private-assets/" "$RELEASE_DIR/x/private-assets"
  [ -d "$CHECKOUT_DIR/x/api" ] && copy_tree "$CHECKOUT_DIR/x/api/" "$RELEASE_DIR/x/api"
  [ -d "$CHECKOUT_DIR/packages/ai" ] && copy_tree "$CHECKOUT_DIR/packages/ai/" "$RELEASE_DIR/packages/ai"
  [ -d "$CHECKOUT_DIR/dist" ] && copy_tree "$CHECKOUT_DIR/dist/" "$RELEASE_DIR/dist"
  [ -d "$CHECKOUT_DIR/public/brand" ] && copy_tree "$CHECKOUT_DIR/public/brand/" "$RELEASE_DIR/public/brand"
  [ -f "$CHECKOUT_DIR/scripts/serve-tiwlo-frontend.mjs" ] && cp "$CHECKOUT_DIR/scripts/serve-tiwlo-frontend.mjs" "$RELEASE_DIR/scripts/serve-tiwlo-frontend.js"

  write_frontend_runtime_manifest
  cp "$CHECKOUT_DIR/x/package.json" "$RELEASE_DIR/x/package.json"
  [ -f "$CHECKOUT_DIR/x/package-lock.json" ] && cp "$CHECKOUT_DIR/x/package-lock.json" "$RELEASE_DIR/x/package-lock.json"
  # The backend dependency tree is no longer needed by the temporary checkout
  # after build and Prisma validation. Move it instead of making a second copy.
  [ -d "$CHECKOUT_DIR/x/node_modules" ] && mv "$CHECKOUT_DIR/x/node_modules" "$RELEASE_DIR/x/node_modules"
  install_frontend_runtime_dependencies

  (cd "$RELEASE_DIR" && patch_release_frontend_server_script)
  obfuscate_dir "$RELEASE_DIR/x/src" 0.55
  obfuscate_dir "$RELEASE_DIR/tSecurity" 0.6
  [ -f "$RELEASE_DIR/scripts/serve-tiwlo-frontend.js" ] && obfuscate_file "$RELEASE_DIR/scripts/serve-tiwlo-frontend.js"
}

move_release_tree() {
  local source="$1" target="$2" entry name
  if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    mv -- "$source" "$target"
    return 0
  fi
  if [ ! -d "$source" ] || [ ! -d "$target" ]; then
    rm -rf -- "$target"
    mv -- "$source" "$target"
    return 0
  fi

  # The production root deliberately retains .env and public/uploads while
  # source code is replaced. Merge only release children into those preserved
  # parent directories, so `mv` never fails merely because the parent exists.
  shopt -s dotglob nullglob
  local entries=("$source"/*)
  for entry in "${entries[@]}"; do
    name="$(basename "$entry")"
    move_release_tree "$entry" "$target/$name"
  done
  shopt -u dotglob nullglob
  rmdir "$source" 2>/dev/null || true
}

install_obfuscated_release() {
  step "Installing obfuscated runtime into production root"
  mkdir -p "$ROOT"
  # The default temporary release directory is a sibling of $ROOT, so a move
  # is atomic and avoids needing space for a full second backend node_modules
  # tree. Fall back to a copy only when an operator configured another disk.
  if [ "$(stat -c %d "$RELEASE_DIR")" = "$(stat -c %d "$ROOT")" ]; then
    shopt -s dotglob nullglob
    local release_entries=("$RELEASE_DIR"/*)
    if [ "${#release_entries[@]}" -gt 0 ]; then
      local entry name
      for entry in "${release_entries[@]}"; do
        name="$(basename "$entry")"
        move_release_tree "$entry" "$ROOT/$name"
      done
    fi
    shopt -u dotglob nullglob
  else
    cp -a "$RELEASE_DIR"/. "$ROOT"/
  fi
  # tSecurity is shipped beside the backend (rather than inside x/src), so
  # Node resolves its third-party imports from tSecurity/node_modules. Reuse
  # the already-installed backend tree instead of storing a second copy of
  # express-fingerprint, request-ip and the other security dependencies.
  if [ -d "$ROOT/x/node_modules" ] && [ -d "$ROOT/tSecurity" ]; then
    rm -rf -- "$ROOT/tSecurity/node_modules"
    ln -s ../x/node_modules "$ROOT/tSecurity/node_modules"
  fi
  mkdir -p "$ROOT/public" "$ROOT/.logs"
  if [ -d "$PRESERVE_DIR/public/uploads" ] && [ ! -e "$ROOT/public/uploads" ]; then
    mkdir -p "$ROOT/public"
    mv "$PRESERVE_DIR/public/uploads" "$ROOT/public/uploads"
  fi
}

bootstrap_social_ai_infrastructure() {
  if [ "$INSTALL_SOCIAL_AI_INFRASTRUCTURE" != "1" ]; then
    echo "Social AI bootstrap skipped by TIWLO_INSTALL_SOCIAL_AI_INFRASTRUCTURE=$INSTALL_SOCIAL_AI_INFRASTRUCTURE"
    return 0
  fi
  local bootstrap="$ROOT/packages/ai/scripts/bootstrap.sh"
  if [ ! -f "$bootstrap" ]; then
    echo "Social AI bundle is not present in this release; skipping Social AI bootstrap."
    return 0
  fi
  step "Bootstrapping persistent Social AI infrastructure"
  # Social AI retries from its health timer. A temporary image registry or
  # upstream-search outage must never leave the main GraphQL release on an old
  # schema after frontend assets have already been replaced.
  if ! run_sudo env TIWLO_ROOT="$ROOT" TIWLO_SOCIAL_AI_DATA_DIR="$ROOT/.data/social-ai" TIWLO_SOCIAL_AI_LOG_DIR="$ROOT/.logs/social-ai" bash "$bootstrap"; then
    echo "Warning: Social AI bootstrap is pending repair; continuing the core Tiwlo deployment." >&2
    echo "Inspect: $ROOT/.logs/social-ai/manager.log" >&2
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

release_frontend_port() {
  if have fuser; then
    run_sudo fuser -k "${FRONTEND_PORT}/tcp" >/dev/null 2>&1 || true
    sleep 1
    return 0
  fi
  if have lsof; then
    local pids
    pids="$(lsof -ti "tcp:${FRONTEND_PORT}" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      # shellcheck disable=SC2086
      run_sudo kill $pids >/dev/null 2>&1 || true
      sleep 1
    fi
  fi
}

release_backend_port() {
  # A stale Node process can keep the API port open while PM2 starts a new
  # process that immediately exits. The old schema then still passes /health,
  # which made a successful deploy look real even though GraphQL was stale.
  if have fuser; then
    run_sudo fuser -k "${BACKEND_PORT}/tcp" >/dev/null 2>&1 || true
    sleep 1
    return 0
  fi
  if have lsof; then
    local pids
    pids="$(lsof -ti "tcp:${BACKEND_PORT}" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      # shellcheck disable=SC2086
      run_sudo kill $pids >/dev/null 2>&1 || true
      sleep 1
    fi
  fi
}

ensure_obfuscated_frontend_service() {
  if [ "$RESTART_SYSTEMD_FRONTEND" != "1" ] || ! have systemctl; then
    return 0
  fi

  local npm_bin
  npm_bin="$(command -v npm || true)"
  if [ -z "$npm_bin" ]; then
    npm_bin="$(find "$ROOT/.tools/node" -path '*/bin/npm' -type f 2>/dev/null | sort | tail -n 1 || true)"
  fi
  if [ -z "$npm_bin" ]; then
    echo "npm was not found; cannot repair tiwlo-frontend.service." >&2
    return 1
  fi

  local node_bin_dir
  local service_path
  local service_file
  local tmp_service
  node_bin_dir="$(dirname "$npm_bin")"
  service_path="${node_bin_dir}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
  service_file="/etc/systemd/system/tiwlo-frontend.service"
  tmp_service="$(mktemp "$TMP_BASE/tiwlo-frontend-service.XXXXXX")"

  cat >"$tmp_service" <<SERVICE
[Unit]
Description=Tiwlo Frontend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT
EnvironmentFile=-$ROOT/.env
Environment=NODE_ENV=production
Environment=PATH=$service_path
Environment=FRONTEND_PORT=$FRONTEND_PORT
Environment=BACKEND_URL=http://127.0.0.1:$BACKEND_PORT
ExecStart=$npm_bin run start -- --port $FRONTEND_PORT
ExecStartPost=/bin/bash -lc 'for i in \$(seq 1 45); do curl -fsS http://127.0.0.1:$FRONTEND_PORT >/dev/null 2>&1 && exit 0; sleep 1; done; echo "Tiwlo frontend did not become healthy on port $FRONTEND_PORT" >&2; exit 1'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

  step "Repairing frontend systemd service"
  run_sudo systemctl stop tiwlo-frontend.service >/dev/null 2>&1 || true
  release_frontend_port
  run_sudo cp "$tmp_service" "$service_file"
  rm -f "$tmp_service"
  run_sudo systemctl daemon-reload
  run_sudo systemctl enable tiwlo-frontend.service >/dev/null 2>&1 || true
  run_sudo systemctl restart tiwlo-frontend.service
}

restart_obfuscated_backend() {
  step "Restarting backend from obfuscated code"
  if have pm2; then
    # Recreate, rather than restart, so PM2 cannot retain an old script path
    # or an old release environment after the production root was replaced.
    pm2 delete "$PM2_APP_NAME" >/dev/null 2>&1 || true
    release_backend_port
    PORT="$BACKEND_PORT" pm2 start "$ROOT/x/src/server.js" \
      --name "$PM2_APP_NAME" \
      --cwd "$ROOT/x" \
      --time \
      --interpreter node
    pm2 save || true
  else
    if have systemctl && systemctl list-unit-files tiwlo-backend.service >/dev/null 2>&1; then
      release_backend_port
      run_sudo systemctl restart tiwlo-backend.service >/dev/null 2>&1 || true
    else
      local pid_file="$ROOT/.logs/${PM2_APP_NAME}.pid"
      if [ -f "$pid_file" ]; then
        local old_pid
        old_pid="$(cat "$pid_file" 2>/dev/null || true)"
        [ -n "$old_pid" ] && kill "$old_pid" >/dev/null 2>&1 || true
        sleep 2
      fi
      release_backend_port
      PORT="$BACKEND_PORT" nohup node "$ROOT/x/src/server.js" \
        >"$ROOT/.logs/${PM2_APP_NAME}.out.log" \
        2>"$ROOT/.logs/${PM2_APP_NAME}.err.log" &
      echo "$!" > "$pid_file"
    fi
  fi

  ensure_obfuscated_frontend_service
}

verify_obfuscated_backend_health() {
  step "Verifying obfuscated backend health"
  local health_url="http://127.0.0.1:$BACKEND_PORT/health"
  local attempt
  for attempt in $(seq 1 45); do
    if curl -fsS --max-time 5 "$health_url" 2>/dev/null | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
      echo "Backend health check passed on port $BACKEND_PORT."
      return 0
    fi
    sleep 1
  done

  echo "Obfuscated backend did not become healthy on port $BACKEND_PORT." >&2
  if have pm2; then
    pm2 describe "$PM2_APP_NAME" || true
    pm2 logs "$PM2_APP_NAME" --lines 100 --nostream || true
  elif [ -f "$ROOT/.logs/${PM2_APP_NAME}.err.log" ]; then
    tail -n 100 "$ROOT/.logs/${PM2_APP_NAME}.err.log" || true
  fi
  return 1
}

verify_social_ai_schema_contract() {
  step "Verifying Social AI GraphQL schema contract"
  local graphql_url="http://127.0.0.1:$BACKEND_PORT/graphql"
  local payload='{"query":"query SocialAiSchemaContract { adminSocialAiOverview }"}'
  local response
  response="$(curl -sS --max-time 10 -X POST "$graphql_url" -H 'Content-Type: application/json' --data "$payload" 2>/dev/null || true)"

  if [ -z "$response" ]; then
    echo "Social AI GraphQL contract check did not receive a response." >&2
    return 1
  fi
  if printf '%s' "$response" | grep -qi 'Cannot query field.*adminSocialAiOverview'; then
    echo "The running backend does not expose adminSocialAiOverview. Refusing to mark this deployment successful." >&2
    return 1
  fi
  if ! printf '%s' "$response" | grep -qE '"data"|"errors"'; then
    echo "Social AI GraphQL contract check returned an unexpected response: $response" >&2
    return 1
  fi
  echo "Social AI GraphQL schema contract passed."
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
  resolve_deploy_paths
  resolve_repo_url

  if ! have git || ! have node || ! have npm; then
    echo "git, node, and npm are required on the server." >&2
    exit 1
  fi

  echo "Production root: $ROOT"
  echo "Deploy script version: $DEPLOY_SCRIPT_VERSION"
  echo "Temporary source only: $TMP_BASE"
  echo "Deploy swap file: $DEPLOY_SWAP_FILE"
  echo "Repository: $REPO_URL"

  install_external_update_command
  recover_stranded_preserve_dirs
  hard_wipe_existing_production_code
  ensure_runtime_env_files
  clone_fresh_source_to_temp
  install_dependencies_and_build
  ensure_obfuscator
  prepare_obfuscated_release
  install_obfuscated_release
  bootstrap_social_ai_infrastructure
  stop_readable_source_services
  restart_obfuscated_backend
  verify_obfuscated_backend_health
  verify_social_ai_schema_contract
  post_wipe_temporary_source

  step "Secure obfuscated deployment complete"
  echo "Readable source and .git are not kept in $ROOT."
  echo "Backend entry: $ROOT/x/src/server.js"
  echo "PM2 app/fallback name: $PM2_APP_NAME"
}

main "$@"
