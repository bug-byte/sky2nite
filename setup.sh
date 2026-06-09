#!/usr/bin/env bash
set -euo pipefail

# ─── Helpers ─────────────────────────────────────────────────────────────────
BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
info()  { echo -e "${BOLD}[sky2nite]${RESET} $*"; }
ok()    { echo -e "${GREEN}[sky2nite]${RESET} $*"; }
warn()  { echo -e "${YELLOW}[sky2nite]${RESET} $*"; }
error() { echo -e "${RED}[sky2nite]${RESET} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Check Node.js ────────────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 \
  || error "Node.js is not installed. Install Node.js >= 20.19 from https://nodejs.org"

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)

if [ "$NODE_MAJOR" -lt 20 ] || { [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -lt 19 ]; }; then
  error "Node.js >= 20.19 is required (found v${NODE_VERSION}). Upgrade from https://nodejs.org"
fi
ok "Node.js v${NODE_VERSION} ✓"

# ─── Environment files ────────────────────────────────────────────────────────
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  warn "Created server/.env from .env.example — review and adjust as needed."
fi

if [ ! -f client/.env ] && [ -f client/.env.example ]; then
  cp client/.env.example client/.env
  warn "Created client/.env from .env.example — add your Google Maps API key if needed."
fi

# ─── PostgreSQL database ──────────────────────────────────────────────────────
info "Setting up PostgreSQL database..."
if command -v psql >/dev/null 2>&1; then
  DB_URL=$(grep '^DATABASE_URL=' server/.env 2>/dev/null | cut -d= -f2-)
  if [ -z "$DB_URL" ]; then
    warn "DATABASE_URL not set in server/.env — skipping automatic database creation."
    warn "Set DATABASE_URL and create the database manually: createdb sky2nite"
  else
    # Test whether the target database is already reachable
    if psql "$DB_URL" -c '\q' >/dev/null 2>&1; then
      ok "Database already reachable ✓"
    else
      # Swap the database segment to 'postgres' to create sky2nite
      PG_ADMIN_URL=$(echo "$DB_URL" | sed 's|/[^/]*$|/postgres|')
      if psql "$PG_ADMIN_URL" -c 'CREATE DATABASE sky2nite;' >/dev/null 2>&1; then
        ok "Database 'sky2nite' created ✓"
      else
        warn "Could not auto-create the database. Create it manually then re-run this script:"
        warn "  createdb sky2nite"
      fi
    fi
  fi
elif command -v docker >/dev/null 2>&1; then
  # No local psql — try to spin up a Postgres container if one isn't already running
  if docker inspect sky2nite-db >/dev/null 2>&1; then
    ok "Docker container 'sky2nite-db' already exists ✓"
  else
    info "psql not found — starting a PostgreSQL Docker container..."
    docker run -d \
      --name sky2nite-db \
      -e POSTGRES_DB=sky2nite \
      -e POSTGRES_USER=sky2nite \
      -e POSTGRES_PASSWORD=sky2nite \
      -p 5432:5432 \
      --restart unless-stopped \
      postgres:17-alpine >/dev/null \
    && ok "Docker container 'sky2nite-db' started on port 5432 ✓" \
    || warn "Failed to start Docker container — start PostgreSQL manually and update server/.env."
  fi
else
  warn "Neither psql nor Docker found — start PostgreSQL manually and update DATABASE_URL in server/.env."
  warn "Quickstart with Docker:  docker run -d --name sky2nite-db -e POSTGRES_DB=sky2nite -e POSTGRES_USER=sky2nite -e POSTGRES_PASSWORD=sky2nite -p 5432:5432 postgres:17-alpine"
fi

# ─── Google Maps API key ─────────────────────────────────────────────────────
_gmk=$(grep '^VITE_GOOGLE_MAPS_API_KEY=' server/.env 2>/dev/null | cut -d= -f2- || true)
if [ -z "$_gmk" ] || [ "$_gmk" = "your_api_key_here" ]; then
  echo
  echo -e "${BOLD}Google Maps API key${RESET} (optional — enables address lookup)"
  echo    "  Get one free at https://console.cloud.google.com/"
  printf  "  Enter key or press Enter to skip: "
  read -r _gmk_input </dev/tty
  if [ -n "$_gmk_input" ]; then
    # Write/replace the key in server/.env
    if grep -q '^VITE_GOOGLE_MAPS_API_KEY=' server/.env 2>/dev/null; then
      sed -i "s|^VITE_GOOGLE_MAPS_API_KEY=.*|VITE_GOOGLE_MAPS_API_KEY=${_gmk_input}|" server/.env
    else
      echo "VITE_GOOGLE_MAPS_API_KEY=${_gmk_input}" >> server/.env
    fi
    _gmk="$_gmk_input"
    ok "Google Maps API key saved to server/.env ✓"
  else
    warn "Skipped — address autocomplete will be unavailable."
  fi
else
  ok "Google Maps API key loaded from server/.env ✓"
fi
echo

# Export so Vite bakes it into the client bundle
[ -n "$_gmk" ] && [ "$_gmk" != "your_api_key_here" ] && export VITE_GOOGLE_MAPS_API_KEY="$_gmk"

# ─── Client ───────────────────────────────────────────────────────────────────
info "Installing client dependencies..."
npm ci --prefix client

info "Building client..."
npm run build --prefix client

# ─── Server ───────────────────────────────────────────────────────────────────
info "Installing server dependencies..."
npm ci --prefix server

info "Building server..."
npm run build --prefix server

# ─── Bundle ───────────────────────────────────────────────────────────────────
info "Copying client build into server/public..."
rm -rf server/public
cp -r client/dist server/public

# ─── Systemd service (Linux only) ────────────────────────────────────────────
if command -v systemctl >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
  APP_DIR="$SCRIPT_DIR/server"
  ENV_FILE="$SCRIPT_DIR/server/.env"
  SERVICE_NAME="sky2nite"
  SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

  info "Installing systemd service '${SERVICE_NAME}'..."

  # Stop existing service if running so we can overwrite the unit file
  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    sudo systemctl stop "$SERVICE_NAME"
  fi

  sudo tee "$SERVICE_FILE" > /dev/null << UNIT
[Unit]
Description=sky2nite astronomy app
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
Environment=NODE_ENV=production
ExecStart=${NODE_BIN} dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME"

  ok "Service '${SERVICE_NAME}' installed and started ✓"
  echo
  echo -e "  ${BOLD}Manage the service:${RESET}"
  echo "    sudo systemctl start   sky2nite"
  echo "    sudo systemctl stop    sky2nite"
  echo "    sudo systemctl restart sky2nite"
  echo "    sudo systemctl status  sky2nite"
  echo "    journalctl -u sky2nite -f   # live logs"
else
  echo -e "  ${BOLD}Start the application:${RESET}"
  echo "    cd server && NODE_ENV=production node dist/index.js"
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
ok "Setup complete! The app will be available at http://localhost:3001"
