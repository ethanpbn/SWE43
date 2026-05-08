
#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

npm --prefix "$ROOT_DIR/backend" install
npm --prefix "$ROOT_DIR/frontend" install

npm --prefix "$ROOT_DIR/backend" start &
BACKEND_PID=$!

npm --prefix "$ROOT_DIR/frontend" start

wait "$BACKEND_PID"