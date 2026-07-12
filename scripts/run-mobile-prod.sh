#!/usr/bin/env bash
# Production Next.js — Arciin Mobile PWA (requires `pnpm build` first).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ROOT}/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "$line" ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    val="${val%\"}"; val="${val#\"}"
    val="${val%\'}"; val="${val#\'}"
    export "$key=$val"
  done <"$ENV_FILE"
fi

BIND_HOST="${ARCIIN_BIND_HOST:-${ARCIIN_MOBILE_BIND_HOST:-0.0.0.0}}"
PORT="${ARCIIN_MOBILE_PORT:-${PORT:-3002}}"
BUILD_ID_FILE="${ROOT}/.next/BUILD_ID"

if [[ ! -f "$BUILD_ID_FILE" ]]; then
  echo "[arciin-mobile] ERROR: No production build in .next (missing BUILD_ID)." >&2
  echo "[arciin-mobile] Run: cd ${ROOT} && pnpm install && pnpm build && pm2 restart arciin-mobile" >&2
  exit 1
fi

exec node "${ROOT}/node_modules/next/dist/bin/next" start -H "${BIND_HOST}" -p "${PORT}"
