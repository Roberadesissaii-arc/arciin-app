#!/usr/bin/env bash
# ================================================================
#  Arciin Mobile — Standalone PWA Installer
#  Supports: Debian/Ubuntu/WSL (apt)
#  Usage:  bash install.sh              — full production install (PM2)
#          bash install.sh --dev        — install deps + start dev server
#          bash install.sh --skip-pm2   — build only, no PM2 launch
# ================================================================
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/mobile-install-lib.sh
source "${ROOT_DIR}/scripts/lib/mobile-install-lib.sh"

mobile_install_ui

DEFAULT_NODE_MAJOR=24
DEFAULT_PNPM_VERSION=10.32.1
DEFAULT_MOBILE_PORT=3001
DEFAULT_API_PORT=4000
ARCIIN_SERVER_DIR="${ARCIIN_SERVER_DIR:-${ROOT_DIR}/../arciin}"

MODE="production"
SKIP_PM2=0
TOTAL_STEPS=10

for _arg in "$@"; do
  case "$_arg" in
    --dev) MODE="dev" ;;
    --skip-pm2) SKIP_PM2=1 ;;
    --help|-h)
      echo "Usage: ./install.sh [--dev] [--skip-pm2]"
      echo ""
      echo "  Installs Arciin Mobile — the standalone phone PWA host."
      echo "  Does not install PostgreSQL or Redis (those live in ../arciin for the server)."
      echo ""
      echo "  --dev        Install dependencies, then run pnpm dev (no PM2)"
      echo "  --skip-pm2   Build production bundle but do not start PM2"
      echo ""
      echo "Environment:"
      echo "  ARCIIN_MOBILE_PORT=3001                    PWA listen port (desktop web + 1; auto if busy)"
      echo "  ARCIIN_SERVER_DIR=../arciin                Sync .env keys from desktop install"
      echo "  ARCIIN_MOBILE_SKIP_SYSTEM_PACKAGES=1       Skip apt packages"
      echo "  ARCIIN_MOBILE_SKIP_FIREWALL=1              Skip UFW"
      echo "  ARCIIN_MOBILE_SKIP_PM2=1                   Same as --skip-pm2"
      echo "  ARCIIN_SERVER_DIR=../arciin                Path to Arciin server repo"
      exit 0
      ;;
  esac
done

[[ "${ARCIIN_MOBILE_SKIP_PM2:-0}" == "1" ]] && SKIP_PM2=1
[[ "$MODE" == "dev" ]] && SKIP_PM2=1

ARCIIN_MOBILE_PORT="${ARCIIN_MOBILE_PORT:-$DEFAULT_MOBILE_PORT}"
ENV_FILE="${ROOT_DIR}/.env.local"

trap 'on_err "$LINENO" "$BASH_COMMAND" "$?"' ERR

# ── Banner ────────────────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BGREEN}     █████╗ ██████╗  ██████╗██╗██╗███╗   ██╗${RESET}"
echo -e "${BGREEN}    ██╔══██╗██╔══██╗██╔════╝██║██║████╗  ██║${RESET}"
echo -e "${BGREEN}    ███████║██████╔╝██║     ██║██║██╔██╗ ██║${RESET}"
echo -e "${BGREEN}    ██╔══██║██╔══██╗██║     ██║██║██║╚██╗██║${RESET}"
echo -e "${BGREEN}    ██║  ██║██║  ██║╚██████╗██║██║██║ ╚████║${RESET}"
echo -e "${BGREEN}    ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝╚═╝╚═╝  ╚═══╝${RESET}  ${WHITE}${BOLD}Mobile${RESET}"
echo ""
echo -e "  ${DIM}Your server, your control.${RESET}                          ${DIM}Mobile${RESET}"
echo -e "  ${DIM}──────────────────────────────────────────────────────────${RESET}"
echo ""

echo -e "  ${DIM}Host:${RESET} $(host_display_name)"
echo -e "  ${DIM}Install path:${RESET} ${ROOT_DIR}"
echo ""

if [[ -t 0 ]] && [[ "${ARCIIN_MOBILE_SKIP_INSTALL_CHOICE:-0}" != "1" ]]; then
  echo -e "  ${BOLD}${WHITE}What are you setting up?${RESET}"
  echo ""
  echo -e "    ${BOLD}1)${RESET} Mobile app only ${DIM}(PWA — port follows desktop: web+1, e.g. 3001 or 3003)${RESET}"
  echo -e "    ${BOLD}2)${RESET} Mobile + Arciin server ${DIM}(install ../arciin first, then point mobile at its API)${RESET}"
  echo ""
  read -r -p "  Choice [1]: " _mobile_choice
  _mobile_choice="${_mobile_choice:-1}"
  if [[ "$_mobile_choice" == "2" ]]; then
    echo ""
    if [[ -d "${ARCIIN_SERVER_DIR}" && -f "${ARCIIN_SERVER_DIR}/install.sh" ]]; then
      echo -e "  ${CYAN}Tip:${RESET} Run the server installer first if you have not already:"
      echo -e "       ${DIM}cd ${ARCIIN_SERVER_DIR} && ./install.sh${RESET}"
    else
      warn "Arciin server not found at ${ARCIIN_SERVER_DIR}"
      echo -e "    Clone or copy the desktop Arciin repo, then run its ${DIM}./install.sh${RESET}"
    fi
    echo ""
  fi
fi

if [[ "${EUID}" -eq 0 ]]; then
  fail "Run this script as your normal user, not as root."
fi

if ! command -v apt-get >/dev/null 2>&1; then
  fail "This installer supports Debian/Ubuntu/WSL with apt. Install Node ${DEFAULT_NODE_MAJOR}+ and pnpm manually on other OSes."
fi

command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"

require_sudo_credentials

# ── 1. System packages ────────────────────────────────────────────────────────
step "System packages"

_apt_install_mobile_deps() {
  local log
  log="$(mktemp)"
  if sudo apt-get install -y -qq \
    ca-certificates curl git gnupg build-essential openssl lsof \
    >"$log" 2>&1; then
    rm -f "$log"
    return 0
  fi
  echo ""
  sed 's/^/    /' "$log"
  rm -f "$log"
  return 1
}

if [[ "${ARCIIN_MOBILE_SKIP_SYSTEM_PACKAGES:-0}" == "1" ]]; then
  ok "Skipping system packages (ARCIIN_MOBILE_SKIP_SYSTEM_PACKAGES=1)"
else
  spin_ok "Updating package lists..." "Package lists updated" sudo apt-get update -qq
  doing "Installing dependencies (curl, git, build tools)..."
  if _apt_install_mobile_deps; then
    done_ "curl, git, build-essential ready"
  else
    warn "apt could not install required packages"
    echo -e "    ${DIM}Fix:${RESET} sudo apt --fix-broken install && sudo dpkg --configure -a"
    fail "System package installation failed"
  fi
fi

# ── 2. Node.js ────────────────────────────────────────────────────────────────
step "Node.js"

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "${NODE_MAJOR}" -ge "${DEFAULT_NODE_MAJOR}" ]]; then
    ok "Node.js $(node -v) already installed"
  else
    _node_label="Upgrading Node.js to ${DEFAULT_NODE_MAJOR}..."
    if spin "$_node_label" install_nodejs_nodesource "${DEFAULT_NODE_MAJOR}"; then
      done_ "Node.js $(node -v) ready"
    else
      report_spin_failure "$_node_label"
    fi
  fi
else
  _node_label="Installing Node.js ${DEFAULT_NODE_MAJOR}..."
  if spin "$_node_label" install_nodejs_nodesource "${DEFAULT_NODE_MAJOR}"; then
    done_ "Node.js $(node -v) installed"
  else
    report_spin_failure "$_node_label"
  fi
fi

# ── 3. pnpm ───────────────────────────────────────────────────────────────────
step "pnpm"

if command -v pnpm >/dev/null 2>&1 && [[ "$(pnpm --version 2>/dev/null)" == "${DEFAULT_PNPM_VERSION}" ]]; then
  ok "pnpm ${DEFAULT_PNPM_VERSION} already active"
else
  spin_ok "Updating Corepack..." "Corepack ready" sudo npm install --global corepack@latest --silent
  corepack enable pnpm
  spin_ok "Activating pnpm ${DEFAULT_PNPM_VERSION}..." "pnpm $(pnpm --version) ready" \
    corepack prepare "pnpm@${DEFAULT_PNPM_VERSION}" --activate
fi

# ── 4. Environment ────────────────────────────────────────────────────────────
step "Environment"

LAN_IP="$(_detect_lan_ip)"

ensure_mobile_env_file "${ROOT_DIR}" "${ENV_FILE}"
sync_mobile_env_from_server "${ENV_FILE}" "${ARCIIN_SERVER_DIR}"
ensure_mobile_env_defaults "${ENV_FILE}"
ensure_mobile_session_secret "${ENV_FILE}"
ensure_mobile_setup_token "${ENV_FILE}"
ensure_mobile_production_secrets "${ENV_FILE}"
configure_mobile_ports "${ENV_FILE}" "${DEFAULT_MOBILE_PORT}" "${DEFAULT_API_PORT}" "${ARCIIN_SERVER_DIR}"
sync_mobile_ports_to_server "${ENV_FILE}" "${ARCIIN_SERVER_DIR}" "$(_detect_lan_ip)" "$(mobile_env_web_port "${ENV_FILE}" "${DEFAULT_MOBILE_PORT}")"
purge_legacy_mobile_env_keys "${ENV_FILE}"
chmod 600 "$ENV_FILE" 2>/dev/null && ok ".env.local readable only by you (chmod 600)" || true

ARCIIN_MOBILE_PORT="$(mobile_env_web_port "${ENV_FILE}" "${DEFAULT_MOBILE_PORT}")"
MOBILE_PUBLIC_URL="$(grep '^ARCIIN_PUBLIC_URL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo "http://${LAN_IP}:${ARCIIN_MOBILE_PORT}")"
SETUP_TOKEN="$(grep '^ARCIIN_SETUP_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"

if [[ -n "$SETUP_TOKEN" ]]; then
  ok "Setup token present (ARCIIN_SETUP_TOKEN)"
else
  warn "ARCIIN_SETUP_TOKEN missing in .env.local"
fi

verify_mobile_api_health "${ENV_FILE}" "${DEFAULT_API_PORT}" || true

# ── 5. Stop conflicting dev servers ───────────────────────────────────────────
step "Prepare host"

if pgrep -f "next dev" &>/dev/null; then
  warn "Stopping existing next dev (blocks production port)..."
  pkill -f "next dev" 2>/dev/null || true
  sleep 2
  ok "Dev servers stopped"
else
  ok "No dev servers blocking port ${ARCIIN_MOBILE_PORT}"
fi

if command -v pm2 &>/dev/null; then
  pm2 stop arciin-mobile &>/dev/null || true
  pm2 delete arciin-mobile &>/dev/null || true
fi

mkdir -p "${ROOT_DIR}/logs"
chmod 700 "${ROOT_DIR}/logs" 2>/dev/null || true
chmod +x "${ROOT_DIR}/scripts/run-mobile-prod.sh" \
  "${ROOT_DIR}/start.sh" "${ROOT_DIR}/stop.sh" 2>/dev/null || true

# ── 6. Dependencies ───────────────────────────────────────────────────────────
step "JavaScript dependencies"

cd "${ROOT_DIR}"
spin_ok "Installing workspace packages..." "Packages installed" \
  bash -c 'pnpm install --silent 2>/dev/null || pnpm install'

# ── 7. Production build ───────────────────────────────────────────────────────
step "Production build"

if [[ "$MODE" == "dev" ]]; then
  warn "Skipping production build (--dev)"
else
  # `next build` fetches Geist / Space Grotesk from Google Fonts at build time.
  # Warn early on an offline host so a font-fetch failure isn't a mystery.
  if ! curl -sf -m 5 "https://fonts.googleapis.com" >/dev/null 2>&1; then
    warn "fonts.googleapis.com unreachable — the build downloads fonts and may fail offline."
  fi
  spin_ok "Building Arciin Mobile..." "Production build ready" pnpm build
fi

# ── 8. PM2 launch ─────────────────────────────────────────────────────────────
step "Production launch"

if [[ "$SKIP_PM2" == "1" ]]; then
  if [[ "$MODE" == "dev" ]]; then
    warn "Skipping PM2 (--dev mode)"
  else
    warn "Skipping PM2 (ARCIIN_MOBILE_SKIP_PM2=1 or --skip-pm2)"
  fi
else
  if ! command -v pm2 &>/dev/null; then
    # Node from NodeSource installs to /usr (root-owned) — global installs need sudo,
    # matching the corepack step above. Without it a fresh host aborts here post-build.
    spin_ok "Installing PM2 process manager..." "PM2 installed" sudo npm install -g pm2
  else
    ok "PM2 $(pm2 --version 2>/dev/null | head -1) already installed"
  fi

  finalize_mobile_ports_before_launch "${ENV_FILE}" "${DEFAULT_MOBILE_PORT}" "${DEFAULT_API_PORT}" "${ARCIIN_SERVER_DIR}"
  ARCIIN_MOBILE_PORT="$(mobile_env_web_port "${ENV_FILE}" "${DEFAULT_MOBILE_PORT}")"
  MOBILE_PUBLIC_URL="$(grep '^ARCIIN_PUBLIC_URL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo "http://${LAN_IP}:${ARCIIN_MOBILE_PORT}")"
  sync_mobile_ports_to_server "${ENV_FILE}" "${ARCIIN_SERVER_DIR}" "$(_detect_lan_ip)" "${ARCIIN_MOBILE_PORT}"

  spin_ok "Starting Arciin Mobile (PM2)..." "PM2 process started" \
    bash -c "cd \"${ROOT_DIR}\" && pm2 start ecosystem.config.cjs && pm2 save"

  if command -v systemctl >/dev/null 2>&1; then
    spin_ok "Configuring auto-start on boot..." "Auto-start configured" \
      bash -c 'PM2_STARTUP="$(pm2 startup 2>&1 | grep sudo | tail -1 || true)"; [[ -n "$PM2_STARTUP" ]] && eval "$PM2_STARTUP" || true'
  fi

  sleep 2
  if pm2 describe arciin-mobile 2>/dev/null | grep -q "online"; then
    ok "Arciin Mobile is online on port ${ARCIIN_MOBILE_PORT} (0.0.0.0)"
  else
    warn "Arciin Mobile did not stay online — check: pm2 logs arciin-mobile"
  fi
fi

# ── 9. Firewall ───────────────────────────────────────────────────────────────
step "Firewall"

configure_mobile_firewall() {
  if [[ "${ARCIIN_MOBILE_SKIP_FIREWALL:-0}" == "1" ]]; then
    warn "Skipping UFW (ARCIIN_MOBILE_SKIP_FIREWALL=1)"
    return 0
  fi

  if ! command -v ufw >/dev/null 2>&1; then
    if sudo apt-get install -y -qq ufw &>/dev/null; then
      ok "ufw installed"
    else
      warn "ufw not available — open TCP port ${ARCIIN_MOBILE_PORT} manually"
      return 0
    fi
  fi

  spin_ok "Allowing Arciin Mobile port ${ARCIIN_MOBILE_PORT}/tcp in UFW..." \
    "Firewall allows port ${ARCIIN_MOBILE_PORT}/tcp" \
    sudo ufw allow "${ARCIIN_MOBILE_PORT}/tcp" comment "Arciin Mobile PWA"

  echo ""
  echo -e "    ${DIM}── sudo ufw status ──${RESET}"
  sudo ufw status 2>/dev/null | sed 's/^/    /' || warn "Could not read ufw status"
}

configure_mobile_firewall

# ── 10. Ready ─────────────────────────────────────────────────────────────────
step "Ready"

MOBILE_URL="http://${LAN_IP}:${ARCIIN_MOBILE_PORT}"
LOCAL_URL="http://localhost:${ARCIIN_MOBILE_PORT}"
API_URL="$(grep '^ARCIIN_API_URL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo "http://127.0.0.1:${DEFAULT_API_PORT}")"
API_HEALTH="${API_URL%/}/api/health"
INSTALL_URL="${MOBILE_URL}/install"
CONNECT_URL="${MOBILE_URL}/connect"
SIGNIN_URL="${MOBILE_URL}/sign-in"

if ! curl -sf "${API_HEALTH}" >/dev/null 2>&1; then
  _api_warn=1
else
  _api_warn=0
fi

echo ""
echo ""
echo -e "  ${BGREEN}╔════════════════════════════════════════════════════════╗${RESET}"
echo -e "  ${BGREEN}║   ✔  Arciin Mobile installation complete!              ║${RESET}"
echo -e "  ${BGREEN}╚════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}${WHITE}Services & ports${RESET}"
echo ""
echo -e "    ${DIM}Mobile PWA (LAN)${RESET}   ${BOLD}${WHITE}${MOBILE_URL}${RESET}  ${DIM}(port ${ARCIIN_MOBILE_PORT})${RESET}"
echo -e "    ${DIM}Mobile PWA (local)${RESET} ${BOLD}${WHITE}${LOCAL_URL}${RESET}"
echo -e "    ${DIM}Arciin API${RESET}         ${BOLD}${WHITE}${API_URL}${RESET}  ${DIM}(browser → ${MOBILE_PUBLIC_URL}/api)${RESET}"
echo ""
echo -e "  ${BOLD}${WHITE}On your phone${RESET}"
echo ""
echo -e "    ${BGREEN}1.${RESET}  Same Wi‑Fi → open ${BOLD}${MOBILE_URL}${RESET}"
echo -e "    ${BGREEN}2.${RESET}  Tap ${BOLD}Install Arciin Mobile${RESET} or use ${BOLD}${INSTALL_URL}${RESET}"
echo -e "    ${BGREEN}3.${RESET}  Add to Home Screen (Safari Share / Chrome Install app)"
echo -e "    ${BGREEN}4.${RESET}  Connect to your Arciin server: ${BOLD}${CONNECT_URL}${RESET}"
echo -e "    ${BGREEN}5.${RESET}  Sign in at ${BOLD}${SIGNIN_URL}${RESET}"
echo ""
if [[ -n "$SETUP_TOKEN" ]]; then
  echo -e "  ${BOLD}${WHITE}Server not claimed yet?${RESET}"
  echo -e "    Complete first-run setup in the ${BOLD}Arciin web app${RESET} on your server (not this mobile client)."
  echo -e "    Setup token from server .env: ${SETUP_TOKEN}"
  echo ""
fi
if [[ "$_api_warn" == "1" ]]; then
  echo -e "  ${YELLOW}${BOLD}Arciin API not reachable${RESET}"
  echo -e "    Install the server stack: ${DIM}cd ${ARCIIN_SERVER_DIR} && ./install.sh${RESET}"
  echo -e "    Install ../arciin and ensure ${DIM}ARCIIN_API_URL${RESET} in .env.local, then ${DIM}pm2 restart arciin-mobile${RESET}"
  echo ""
fi
echo -e "  ${BOLD}${WHITE}PM2 commands${RESET}"
echo -e "    ${DIM}pm2 status${RESET}                 Process list"
echo -e "    ${DIM}pm2 logs arciin-mobile${RESET}     Mobile logs"
echo -e "    ${DIM}bash stop.sh${RESET}                Stop mobile app"
echo -e "    ${DIM}bash start.sh${RESET}               Start mobile app"
echo ""
echo -e "  ${BOLD}${WHITE}Development${RESET}"
echo -e "    ${DIM}pnpm dev --port ${ARCIIN_MOBILE_PORT}${RESET}   Hot reload (do not use on production server)"
echo ""
echo -e "  ${BOLD}${WHITE}Offline & install (HTTPS)${RESET}"
echo -e "    Add to Home Screen works over LAN HTTP, but the ${BOLD}offline cache${RESET} (service"
echo -e "    worker) only runs on a ${BOLD}secure origin${RESET} — HTTPS or localhost. Over"
echo -e "    ${DIM}http://${LAN_IP}:${ARCIIN_MOBILE_PORT}${RESET} it is disabled by the browser."
echo -e "    For full offline PWA support, serve over HTTPS via the Arciin server's"
echo -e "    Cloudflare tunnel / reverse proxy, then open that ${BOLD}https://${RESET} URL on the phone."
echo ""
echo -e "  ${BOLD}${WHITE}Important${RESET}"
echo -e "    Mobile is the ${BOLD}PWA shell${RESET} — files and accounts live on the Arciin API."
echo -e "    ${DIM}.env.local${RESET} is mode 600; same keys as desktop ${DIM}.env${RESET} (install fills defaults)."
echo -e "    After .env.local changes: ${DIM}pnpm build && pm2 restart arciin-mobile${RESET}"
echo ""

if [[ "$MODE" == "dev" ]]; then
  echo -e "  ${CYAN}Starting dev server on port ${ARCIIN_MOBILE_PORT}…${RESET}"
  echo ""
  exec pnpm dev --port "${ARCIIN_MOBILE_PORT}"
fi
