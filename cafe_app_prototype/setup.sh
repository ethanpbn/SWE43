#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

step() { echo -e "\n${CYAN}${BOLD}▸ $1${NC}"; }
ok()   { echo -e "  ${GREEN}✓ $1${NC}"; }
warn() { echo -e "  ${YELLOW}! $1${NC}"; }
err()  { echo -e "  ${RED}✗ $1${NC}"; }

echo ""
echo -e "${BOLD}Cafe Finder — Setup${NC}"
echo    "===================="

# ── 1. Check prerequisites ───────────────────────────────────────────────────
step "Checking prerequisites"

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "$2 not found. Please install it and re-run setup."
    case "$1" in
      node|npm) echo "       -> https://nodejs.org" ;;
      psql)     echo "       -> https://www.postgresql.org/download/" ;;
    esac
    exit 1
  fi
  ok "$2  ($($1 --version 2>&1 | head -1))"
}

require_cmd node "Node.js"
require_cmd npm  "npm"
require_cmd psql "PostgreSQL"

# ── 2. Configure backend .env ────────────────────────────────────────────────
step "Configuring backend environment"

ENV_FILE="$ROOT_DIR/backend/.env"

if [ -f "$ENV_FILE" ]; then
  ok ".env already exists — skipping"
else
  echo ""
  echo "  No .env found. Enter your PostgreSQL connection details."
  echo "  Press Enter to accept the default shown in [brackets]."
  echo ""

  read -p "  DB host     [localhost] : " DB_HOST;     DB_HOST="${DB_HOST:-localhost}"
  read -p "  DB port     [5432]      : " DB_PORT;     DB_PORT="${DB_PORT:-5432}"
  read -p "  DB name     [cafeapp]   : " DB_NAME;     DB_NAME="${DB_NAME:-cafeapp}"
  read -p "  DB user     [postgres]  : " DB_USER;     DB_USER="${DB_USER:-postgres}"
  read -sp "  DB password             : " DB_PASSWORD; echo ""

  cat > "$ENV_FILE" <<EOF
PORT=3000
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
EOF

  ok ".env created at backend/.env"
fi

# Parse credentials from .env for use in this script
_val() { grep "^${1}=" "$ENV_FILE" | cut -d= -f2-; }
DB_HOST="$(_val DB_HOST)"
DB_PORT="$(_val DB_PORT)"
DB_NAME="$(_val DB_NAME)"
DB_USER="$(_val DB_USER)"
DB_PASSWORD="$(_val DB_PASSWORD)"

PG="PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -p $DB_PORT"

# ── 3. Create the database ────────────────────────────────────────────────────
step "Setting up PostgreSQL database"

DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" \
  -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" \
  postgres 2>/dev/null || echo "")

if [ "$DB_EXISTS" = "1" ]; then
  ok "Database '${DB_NAME}' already exists"
else
  if PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" \
      -c "CREATE DATABASE ${DB_NAME};" postgres &>/dev/null; then
    ok "Database '${DB_NAME}' created"
  else
    err "Could not create database '${DB_NAME}'."
    echo "    Check that PostgreSQL is running and your credentials are correct."
    echo "    Test with: psql -U ${DB_USER} -h ${DB_HOST} postgres"
    exit 1
  fi
fi

# ── 4. Initialize tables ──────────────────────────────────────────────────────
step "Initializing database tables"

PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_lat  DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_lng  DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS cafes (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  location    VARCHAR(255),
  description TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  cafe_id    INTEGER REFERENCES cafes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, cafe_id)
);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (blocker_id, blocked_id)
);
SQL

ok "Tables ready"

# ── 5. Install dependencies ───────────────────────────────────────────────────
step "Installing backend dependencies"
npm --prefix "$ROOT_DIR/backend" install --silent
ok "Backend packages installed"

step "Installing frontend dependencies"
npm --prefix "$ROOT_DIR/frontend" install --silent
ok "Frontend packages installed"

# ── 6. Seed cafe data ─────────────────────────────────────────────────────────
step "Seeding cafe data"

CAFE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" \
  "$DB_NAME" -tAc "SELECT COUNT(*) FROM cafes" 2>/dev/null || echo "0")

if [ "$CAFE_COUNT" -gt "0" ]; then
  ok "Cafe data already present (${CAFE_COUNT} cafes) — skipping"
else
  (cd "$ROOT_DIR/backend" && node seed.js)
  ok "Cafes seeded"
fi

# ── 7. Seed demo users ────────────────────────────────────────────────────────
step "Creating demo user accounts"
(cd "$ROOT_DIR/backend" && node seed-demo-users.js)
ok "Demo users ready"

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Setup complete!${NC}"
echo ""
echo "  Start the app:    ./start.sh"
echo "  Then open:        http://localhost:8081"
echo ""
echo "  Demo accounts (all use password: demo1234)"
echo "  ┌─────────────────────┬──────────┐"
echo "  │ alice@demo.com      │ demo1234 │"
echo "  │ bob@demo.com        │ demo1234 │"
echo "  │ carol@demo.com      │ demo1234 │"
echo "  └─────────────────────┴──────────┘"
echo ""
echo "  Demo users have pre-set locations near Irvine, CA so they"
echo "  appear on the map immediately after enabling Location in Profile."
echo ""
