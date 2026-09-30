#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/reference-api"
command -v node >/dev/null 2>&1 || { echo "Node.js is required." >&2; exit 1; }
echo "Starting Cost IQ v9.1 reference API on http://127.0.0.1:8787"
node ./server.mjs
