#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

ok()   { echo -e "  ${GREEN}✓ $1${NC}"; }
warn() { echo -e "  ${YELLOW}! $1${NC}"; }
err()  { echo -e "  ${RED}✗ $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}▸ $1${NC}"; }

echo ""
echo -e "${BOLD}Cafe Finder — Test Suite${NC}"
echo    "========================="
echo    "  No database required. All external dependencies are mocked."

# ── 1. Node.js ────────────────────────────────────────────────────────────────
step "Checking prerequisites"

if ! command -v node &>/dev/null; then
  err "Node.js not found. Install it from https://nodejs.org and re-run."
fi
if ! command -v npm &>/dev/null; then
  err "npm not found. Install it from https://nodejs.org and re-run."
fi

ok "Node.js  ($(node --version))"
ok "npm      ($(npm --version))"

# ── 2. Backend dependencies ───────────────────────────────────────────────────
step "Installing backend dependencies"

npm --prefix "$BACKEND_DIR" install --silent
ok "Dependencies ready"

# ── 3. Run tests ──────────────────────────────────────────────────────────────
step "Running tests"
echo ""

npm --prefix "$BACKEND_DIR" test
