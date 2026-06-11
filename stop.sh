#!/usr/bin/env bash
set -euo pipefail
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop arciin-mobile 2>/dev/null || true
  pm2 delete arciin-mobile 2>/dev/null || true
fi
echo "Arciin Mobile stopped."
