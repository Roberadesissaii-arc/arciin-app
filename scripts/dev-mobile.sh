#!/usr/bin/env bash
# Dev server — loads .env.local, uses PORT / ARCIIN_WEB_PORT, warns if API is down.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ROOT}/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" | sed 's/\r$//')
  set +a
fi

export NODE_ENV=development
PORT="${PORT:-${ARCIIN_WEB_PORT:-3002}}"
BIND_HOST="${ARCIIN_BIND_HOST:-0.0.0.0}"
API_URL="${ARCIIN_API_URL:-http://127.0.0.1:${API_PORT:-4000}}"
API_HEALTH="${API_URL%/}/api/health"
ARCIIN_SERVER_DIR="${ARCIIN_SERVER_DIR:-${ROOT}/../arciin}"

echo ""
echo "Arciin Mobile dev"
echo "  PWA   → http://127.0.0.1:${PORT}  (LAN: check ARCIIN_PUBLIC_URL in .env.local)"
echo "  /api  → rewrites to ${API_URL}"
echo ""

if ! curl -sf "${API_HEALTH}" >/dev/null 2>&1; then
  echo "⚠  Arciin API is not running at ${API_HEALTH}"
  echo "   Setup and sign-in need the API. Start the server stack first:"
  echo ""
  if [[ -d "${ARCIIN_SERVER_DIR}" ]]; then
    echo "   cd ${ARCIIN_SERVER_DIR} && pm2 start arciin-api arciin-worker arciin-web"
    echo "   # or full dev: cd ${ARCIIN_SERVER_DIR} && pnpm dev"
  else
    echo "   cd ../arciin && pm2 start arciin-api arciin-worker arciin-web"
  fi
  echo ""
else
  echo "✔  Arciin API is up (${API_HEALTH})"
  echo ""
fi

exec pnpm exec next dev --hostname "${BIND_HOST}" --port "${PORT}"
