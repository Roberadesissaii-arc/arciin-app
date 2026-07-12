#!/usr/bin/env bash
# Rebuild and restart Arciin Mobile + API so Remote Access uses mobile port (:3003).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCIIN_ROOT="${ARCIIN_ROOT:-$(cd "$ROOT/../arciin" 2>/dev/null && pwd || true)}"

echo "==> Rebuilding Arciin Mobile (arciin-app)…"
cd "$ROOT"
pnpm build
pm2 restart arciin-mobile

if [[ -n "${ARCIIN_ROOT}" && -d "$ARCIIN_ROOT" ]]; then
  echo "==> Rebuilding Arciin API…"
  cd "$ARCIIN_ROOT"
  pnpm build:api
  echo "==> Restarting API (tunnel will target mobile :3003 when ARCIIN_MOBILE_PORT is set)…"
  pm2 restart arciin-api
else
  echo "==> Skipping API rebuild (../arciin not found). Run: pm2 restart arciin-api"
fi

echo ""
echo "Done. On your phone:"
echo "  1. Open http://$(hostname -I 2>/dev/null | awk '{print $1}'):3003 (not :3002)"
echo "  2. Hard refresh / re-open the PWA"
echo "  3. Profile → Remote access → Stop tunnel → Start tunnel"
echo "  4. Wait ~30s, then Use public URL with the NEW trycloudflare link"
