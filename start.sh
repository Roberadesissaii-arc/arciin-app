#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "PM2 not found. Run ./install.sh first." >&2
  exit 1
fi
pm2 start ecosystem.config.cjs
pm2 save
echo "Arciin Mobile started. pm2 logs arciin-mobile"
