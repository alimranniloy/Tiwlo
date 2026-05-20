#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT/.tools"
DOWNLOADS_DIR="$TOOLS_DIR/downloads"
DATA_DIR="$ROOT/.data"
LOGS_DIR="$ROOT/.logs"

NODE_VERSION="24.15.0"
case "$(uname -s)" in
  Linux) NODE_OS="linux" ;;
  Darwin) NODE_OS="darwin" ;;
  *) echo "Unsupported OS for automatic Node.js download: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) NODE_ARCH="x64" ;;
  arm64|aarch64) NODE_ARCH="arm64" ;;
  *) echo "Unsupported CPU architecture for automatic Node.js download: $(uname -m)" >&2; exit 1 ;;
esac
NODE_FOLDER="node-v${NODE_VERSION}-${NODE_OS}-${NODE_ARCH}"
NODE_TARBALL="${NODE_FOLDER}.tar.xz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TARBALL}"

BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
FRONTEND_GRAPHQL_URL="${FRONTEND_GRAPHQL_URL:-http://localhost:${BACKEND_PORT}/graphql}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-http://localhost:${FRONTEND_PORT}}"
API_BASE_URL="${API_BASE_URL:-http://localhost:${BACKEND_PORT}}"
DATABASE_NAME="${DATABASE_NAME:-tiwlo}"
DATABASE_USER="${DATABASE_USER:-postgres}"
DATABASE_PASSWORD="${DATABASE_PASSWORD:-postgres}"
SKIP_SEED="${SKIP_SEED:-0}"

mkdir -p "$TOOLS_DIR" "$DOWNLOADS_DIR" "$DATA_DIR" "$LOGS_DIR"

step() {
  echo
  echo "==> $*"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOGS_DIR/setup.log"
}

have() {
  command -v "$1" >/dev/null 2>&1
}

download() {
  local url="$1"
  local output="$2"
  [ -f "$output" ] && return 0
  step "Downloading $url"
  if have curl; then
    curl -fL "$url" -o "$output"
  elif have wget; then
    wget -O "$output" "$url"
  else
    echo "curl or wget is required to download local tools." >&2
    exit 1
  fi
}

ensure_node() {
  if have node && have npm && [ "$(node -v)" = "v${NODE_VERSION}" ]; then
    return 0
  fi

  local node_root="$TOOLS_DIR/node"
  local node_bin="$node_root/$NODE_FOLDER/bin"
  if [ ! -x "$node_bin/node" ]; then
    download "$NODE_URL" "$DOWNLOADS_DIR/$NODE_TARBALL"
    step "Extracting $NODE_TARBALL"
    mkdir -p "$node_root"
    tar -xJf "$DOWNLOADS_DIR/$NODE_TARBALL" -C "$node_root"
  fi
  export PATH="$node_bin:$PATH"
}

sudo_cmd() {
  if [ "$(id -u)" = "0" ]; then
    "$@"
  elif have sudo; then
    sudo "$@"
  else
    echo "sudo is required to install PostgreSQL automatically on this server." >&2
    exit 1
  fi
}

find_pg_bin() {
  if have pg_ctl && have psql && have initdb; then
    dirname "$(command -v pg_ctl)"
    return 0
  fi

  local candidate
  candidate="$(find /usr/lib/postgresql /usr/local/opt /opt/homebrew/opt -path '*/bin/pg_ctl' 2>/dev/null | sort | tail -n 1 || true)"
  if [ -n "$candidate" ]; then
    dirname "$candidate"
    return 0
  fi

  return 1
}

install_postgres() {
  if find_pg_bin >/dev/null; then
    return 0
  fi

  step "Installing PostgreSQL tools"
  if have apt-get; then
    sudo_cmd apt-get update
    sudo_cmd apt-get install -y postgresql postgresql-contrib
  elif have dnf; then
    sudo_cmd dnf install -y postgresql-server postgresql-contrib
  elif have yum; then
    sudo_cmd yum install -y postgresql-server postgresql-contrib
  elif have brew; then
    brew install postgresql@17 || brew install postgresql
  else
    echo "No supported package manager found. Install PostgreSQL, then rerun this script." >&2
    exit 1
  fi
}

port_open() {
  local port="$1"
  (echo >"/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1
}

pg_ready() {
  local pg_bin="$1"
  local port="$2"
  "$pg_bin/pg_isready" -h 127.0.0.1 -p "$port" -U "$DATABASE_USER" >/dev/null 2>&1
}

psql_password_works() {
  local pg_bin="$1"
  local port="$2"
  PGPASSWORD="$DATABASE_PASSWORD" "$pg_bin/psql" -h 127.0.0.1 -p "$port" -U "$DATABASE_USER" -d postgres -tAc "SELECT 1" >/dev/null 2>&1
}

prepare_system_postgres_password() {
  local pg_bin="$1"
  local port="$2"
  if psql_password_works "$pg_bin" "$port"; then
    return 0
  fi
  if have sudo; then
    sudo -u postgres "$pg_bin/psql" -p "$port" -d postgres -c "ALTER USER ${DATABASE_USER} WITH PASSWORD '${DATABASE_PASSWORD}';" >/dev/null 2>&1 || true
  fi
}

ensure_database() {
  install_postgres
  local pg_bin
  pg_bin="$(find_pg_bin)"
  export PATH="$pg_bin:$PATH"

  local pg_port=5432
  if pg_ready "$pg_bin" "$pg_port"; then
    prepare_system_postgres_password "$pg_bin" "$pg_port"
  else
    local pg_data="$DATA_DIR/postgres"
    local pg_log="$LOGS_DIR/postgres.log"
    if [ -e "$pg_data/PG_VERSION" ]; then
      :
    else
      step "Initializing local PostgreSQL data directory"
      "$pg_bin/initdb" -D "$pg_data" -U "$DATABASE_USER" -A trust -E UTF8
    fi

    if port_open "$pg_port"; then
      pg_port=55432
    fi

    if ! pg_ready "$pg_bin" "$pg_port"; then
      step "Starting PostgreSQL on port $pg_port"
      "$pg_bin/pg_ctl" -D "$pg_data" -l "$pg_log" -o "-p $pg_port" -w -t 30 start
    fi
  fi

  for _ in $(seq 1 30); do
    pg_ready "$pg_bin" "$pg_port" && break
    sleep 1
  done

  if ! pg_ready "$pg_bin" "$pg_port"; then
    echo "PostgreSQL is not ready on port $pg_port. Check $LOGS_DIR/postgres.log" >&2
    exit 1
  fi

  if ! psql_password_works "$pg_bin" "$pg_port"; then
    prepare_system_postgres_password "$pg_bin" "$pg_port"
  fi

  local exists
  exists="$(PGPASSWORD="$DATABASE_PASSWORD" "$pg_bin/psql" -h 127.0.0.1 -p "$pg_port" -U "$DATABASE_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DATABASE_NAME}'" 2>/dev/null || true)"
  if [ "$exists" != "1" ]; then
    step "Creating PostgreSQL database '$DATABASE_NAME'"
    PGPASSWORD="$DATABASE_PASSWORD" "$pg_bin/createdb" -h 127.0.0.1 -p "$pg_port" -U "$DATABASE_USER" "$DATABASE_NAME"
  fi

  echo "$pg_port"
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"
  touch "$file"
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

ensure_env_files() {
  local pg_port="$1"
  local database_url="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@127.0.0.1:${pg_port}/${DATABASE_NAME}?schema=public"
  set_env_value "$ROOT/.env" VITE_GRAPHQL_URL "$FRONTEND_GRAPHQL_URL"
  set_env_value "$ROOT/.env" APP_URL "$FRONTEND_ORIGIN"
  set_env_value "$ROOT/x/.env" DATABASE_URL "$database_url"
  set_env_value "$ROOT/x/.env" JWT_SECRET "dev-local-change-before-production"
  set_env_value "$ROOT/x/.env" PORT "$BACKEND_PORT"
  set_env_value "$ROOT/x/.env" FRONTEND_ORIGIN "$FRONTEND_ORIGIN"
  set_env_value "$ROOT/x/.env" API_BASE_URL "$API_BASE_URL"
}

run_npm() {
  step "npm $*"
  (cd "$ROOT" && npm "$@")
}

ensure_dependencies() {
  run_npm install
  run_npm --prefix x install
}

wait_http() {
  local url="$1"
  local name="$2"
  for _ in $(seq 1 60); do
    if have curl && curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "$name did not respond yet. Check $LOGS_DIR." >&2
}

start_process() {
  local name="$1"
  local port="$2"
  shift 2
  if port_open "$port"; then
    echo "$name already appears to be running on port $port"
    return 0
  fi
  step "Starting $name on port $port"
  (cd "$ROOT" && nohup "$@" >"$LOGS_DIR/${name}.out.log" 2>"$LOGS_DIR/${name}.err.log" &)
}

step "Preparing Node.js"
ensure_node
node -v
npm -v

step "Preparing PostgreSQL"
PG_PORT="$(ensure_database | tail -n 1)"
ensure_env_files "$PG_PORT"

step "Installing project dependencies if needed"
ensure_dependencies

if ! port_open "$BACKEND_PORT"; then
  step "Preparing Prisma database"
  run_npm --prefix x run db:generate
  run_npm --prefix x run db:push
  if [ "$SKIP_SEED" != "1" ]; then
    run_npm --prefix x run db:seed
  fi
fi

start_process backend "$BACKEND_PORT" npm --prefix x run dev
wait_http "http://localhost:${BACKEND_PORT}/health" "Backend" || true

step "Building production frontend"
run_npm run build

start_process frontend "$FRONTEND_PORT" npm run serve -- --port "$FRONTEND_PORT"
wait_http "http://localhost:${FRONTEND_PORT}" "Frontend" || true

echo
echo "Tiwlo is live."
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Backend:  http://localhost:${BACKEND_PORT}/graphql"
echo "Database: postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@127.0.0.1:${PG_PORT}/${DATABASE_NAME}"
echo "Logs:     $LOGS_DIR"
