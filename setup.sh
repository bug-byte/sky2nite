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
else
  warn "psql not found — skipping automatic database setup."
  warn "Install PostgreSQL, then create the database: createdb sky2nite"
  warn "Update DATABASE_URL in server/.env before starting the server."
fi

# ─── Client ───────────────────────────────────────────────────────────────────
info "Installing client dependencies..."
npm ci --prefix client

# Export VITE vars from server/.env so Vite bakes them into the client bundle
_gmk=$(grep '^VITE_GOOGLE_MAPS_API_KEY=' server/.env 2>/dev/null | cut -d= -f2- || true)
if [ -n "$_gmk" ] && [ "$_gmk" != "your_api_key_here" ]; then
  export VITE_GOOGLE_MAPS_API_KEY="$_gmk"
  ok "Google Maps API key loaded from server/.env ✓"
else
  warn "VITE_GOOGLE_MAPS_API_KEY not set in server/.env — address autocomplete will be unavailable."
fi

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

# ─── Done ─────────────────────────────────────────────────────────────────────
ok "Setup complete!"
echo
echo -e "  ${BOLD}Start the application:${RESET}"
echo "    cd server && NODE_ENV=production node dist/index.js"
echo
echo "  The app will be available at http://localhost:3000"
