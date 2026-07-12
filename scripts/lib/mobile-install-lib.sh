#!/usr/bin/env bash
# Shared helpers for arciin-app/install.sh (styled like ../arciin/install.sh)
# shellcheck shell=bash

mobile_install_colors() {
  BOLD="\033[1m"
  GREEN="\033[32m"
  BGREEN="\033[1;32m"
  YELLOW="\033[33m"
  CYAN="\033[36m"
  BCYAN="\033[1;36m"
  RED="\033[31m"
  DIM="\033[2m"
  WHITE="\033[97m"
  RESET="\033[0m"
}

mobile_install_ui() {
  mobile_install_colors
  STEP=0
  LAST_SPIN_LOG=""

  step() {
    STEP=$((STEP + 1))
    echo ""
    echo -e "  ${BCYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "  ${WHITE}${BOLD}  Step ${STEP}/${TOTAL_STEPS}  ${RESET}${BOLD}$1${RESET}"
    echo -e "  ${BCYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  }

  ok()      { echo -e "    ${GREEN}✔${RESET}  $1"; }
  doing()   { echo -ne "    ${CYAN}⟳${RESET}  ${DIM}$1${RESET}"; }
  done_()   { echo -ne "\r\033[2K"; echo -e "    ${GREEN}✔${RESET}  $1"; }
  warn()    { echo -e "    ${YELLOW}⚠${RESET}  $1"; }
  fail()    { echo -e "    ${RED}✖${RESET}  $1"; exit 1; }

  on_err() {
    local line="$1" cmd="$2" code="$3"
    echo ""
    echo -e "    ${RED}Installer error at line ${line}${RESET}"
    echo -e "    ${DIM}Command:${RESET} ${cmd}"
    if [[ -n "${LAST_SPIN_LOG:-}" && -f "${LAST_SPIN_LOG:-}" ]]; then
      echo ""
      echo -e "    ${YELLOW}Last step output:${RESET}"
      sed 's/^/    /' "$LAST_SPIN_LOG"
      rm -f "$LAST_SPIN_LOG"
      LAST_SPIN_LOG=""
    fi
    exit "$code"
  }

  spin() {
    local msg="$1"; shift
    local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local start i=0 pid elapsed mins secs c log_file exit_code

    log_file="$(mktemp)"
    LAST_SPIN_LOG="$log_file"
    "$@" >"$log_file" 2>&1 &
    pid=$!
    start=$(date +%s)

    while kill -0 "$pid" 2>/dev/null; do
      elapsed=$(( $(date +%s) - start ))
      mins=$(( elapsed / 60 )); secs=$(( elapsed % 60 ))
      c="${chars:$((i % ${#chars})):1}"
      if (( elapsed >= 2 )); then
        printf "\r    ${CYAN}%s${RESET}  ${DIM}%s — %d:%02d${RESET}   " "$c" "$msg" "$mins" "$secs"
      else
        printf "\r    ${CYAN}%s${RESET}  ${DIM}%s${RESET}   " "$c" "$msg"
      fi
      i=$(( i + 1 ))
      sleep 0.15
    done

    wait "$pid"
    exit_code=$?
    printf "\r\033[2K"
    if [[ $exit_code -eq 0 ]]; then
      rm -f "$log_file"
      LAST_SPIN_LOG=""
    fi
    return $exit_code
  }

  report_spin_failure() {
    local label="$1"
    echo ""
    echo -e "    ${RED}Step failed:${RESET} $label"
    if [[ -n "${LAST_SPIN_LOG:-}" && -f "${LAST_SPIN_LOG:-}" ]]; then
      echo ""
      echo -e "    ${YELLOW}Command output:${RESET}"
      sed 's/^/    /' "$LAST_SPIN_LOG"
      rm -f "$LAST_SPIN_LOG"
      LAST_SPIN_LOG=""
    fi
    fail "$label failed"
  }

  spin_ok() {
    local label="$1" done_msg="$2"; shift 2
    if spin "$label" "$@"; then
      done_ "$done_msg"
    else
      report_spin_failure "$label"
    fi
  }
}

host_display_name() {
  local model
  if [[ -f /proc/device-tree/model ]]; then
    model="$(tr -d '\0' </proc/device-tree/model 2>/dev/null | head -c 120)"
    if [[ -n "$model" ]]; then
      echo "$model"
      return
    fi
  fi
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    echo "${PRETTY_NAME:-Linux}"
    return
  fi
  echo "Linux"
}

_detect_lan_ip() {
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{
    for (i = 1; i <= NF; i++)
      if ($i !~ /^127\./) { print $i; exit }
  }')"
  if [[ -n "$ip" ]]; then
    echo "$ip"
    return
  fi
  ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") { print $(i+1); exit }}')"
  [[ -n "$ip" ]] && echo "$ip" || echo "127.0.0.1"
}

_port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    if ss -tlnH "sport = :${port}" 2>/dev/null | grep -q .; then
      return 0
    fi
  fi
  if lsof -iTCP:"${port}" -sTCP:LISTEN &>/dev/null 2>&1; then
    return 0
  fi
  return 1
}

_port_bind_test_free() {
  local port="$1"
  command -v node >/dev/null 2>&1 || return 0
  node -e "
    const net = require('net');
    const s = net.createServer();
    s.once('error', () => process.exit(1));
    s.once('listening', () => { s.close(() => process.exit(0)); });
    s.listen(${port}, '0.0.0.0');
  " &>/dev/null
}

_port_available() {
  local port="$1"
  ! _port_in_use "$port" && _port_bind_test_free "$port"
}

_find_free_port() {
  local start_port="${1:-3002}"
  local end_port="${2:-3099}"
  local port="$start_port"
  while (( port <= end_port )); do
    if _port_available "$port"; then
      echo "$port"
      return 0
    fi
    port=$(( port + 1 ))
  done
  echo "$start_port"
}

_set_env_kv() {
  local env_file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$env_file" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$env_file"
  else
    echo "${key}=${value}" >>"$env_file"
  fi
}

wait_for_apt_lock() {
  local max_wait="${1:-180}" elapsed=0
  while (( elapsed < max_wait )); do
    if ! sudo fuser /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/lib/apt/lists/lock >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    elapsed=$(( elapsed + 1 ))
  done
  return 1
}

apt_get_install() {
  local max_attempts=5 attempt
  for (( attempt = 1; attempt <= max_attempts; attempt++ )); do
    wait_for_apt_lock || return 1
    if sudo apt-get install -y -qq "$@"; then
      return 0
    fi
    if (( attempt < max_attempts )); then
      sleep $(( attempt * 2 ))
    fi
  done
  return 1
}

install_nodejs_nodesource() {
  local major="$1"
  curl -fsSL "https://deb.nodesource.com/setup_${major}.x" | sudo bash -
  wait_for_apt_lock || return 1
  apt_get_install nodejs
}

require_sudo_credentials() {
  if sudo -n true 2>/dev/null; then
    return 0
  fi
  echo ""
  echo -e "  ${YELLOW}Administrator access required${RESET}"
  echo -e "  ${DIM}Native install uses sudo for apt, firewall, and PM2 boot setup.${RESET}"
  if [[ -t 0 ]]; then
    echo ""
    if ! sudo -v; then
      fail "sudo authentication failed"
    fi
    ok "sudo credentials cached"
  else
    echo ""
    echo -e "  ${DIM}Run ${RESET}sudo -v${DIM}, then re-run:${RESET}  ./install.sh"
    echo -e "  ${DIM}Or skip apt:${RESET}  ARCIIN_MOBILE_SKIP_SYSTEM_PACKAGES=1 ./install.sh"
    fail "sudo credentials required (no TTY for password prompt)"
  fi
}

# ── Environment (mirrors ../arciin/install.sh) ───────────────────────────────

ARCIIN_DEFAULT_STORAGE="/srv/arciin-storage/arciin"

_gen_secret() {
  openssl rand -base64 32 2>/dev/null | tr -d '\n=' || \
    head -c 32 /dev/urandom | base64 2>/dev/null | tr -d '\n=' || \
    echo "changeme-$(date +%s)-$(( RANDOM * RANDOM ))"
}

_env_public_url_port() {
  grep '^ARCIIN_PUBLIC_URL=' "$1" 2>/dev/null | sed -n 's|.*:\([0-9][0-9]*\)$|\1|p' | head -1
}

_env_kv_or_default() {
  local env_file="$1" key="$2" default="$3"
  if ! grep -q "^${key}=" "$env_file" 2>/dev/null; then
    _set_env_kv "$env_file" "$key" "$default"
  fi
}

ensure_mobile_env_file() {
  local root_dir="$1" env_file="$2"
  if [[ ! -f "$env_file" ]]; then
    if [[ ! -f "${root_dir}/.env.example" ]]; then
      fail ".env.example not found — cannot create .env.local"
    fi
    cp "${root_dir}/.env.example" "$env_file"
    ok "Created .env.local from .env.example"
  else
    ok ".env.local present"
  fi
}

# Server-only secrets and desktop web port/URL — mobile uses ARCIIN_MOBILE_PORT (sequenced after desktop).
_MOBILE_ENV_SKIP_KEYS=" DATABASE_URL REDIS_URL SESSION_SECRET PORT ARCIIN_WEB_PORT ARCIIN_PUBLIC_URL NEXT_PUBLIC_ARCIIN_PUBLIC_URL ARCIIN_MOBILE_PORT ARCIIN_MOBILE_PUBLIC_URL "

sync_mobile_env_from_server() {
  local env_file="$1" server_dir="$2"
  local server_env="${server_dir}/.env"
  [[ -f "$server_env" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line//[[:space:]]/}" ]] && continue
    local key="${line%%=*}"
    local val="${line#*=}"
    [[ "$key" == "$line" ]] && continue
    # Skip server secrets — the mobile app talks to the API over the network, not the DB.
    [[ "$_MOBILE_ENV_SKIP_KEYS" == *" ${key} "* ]] && continue
    _set_env_kv "$env_file" "$key" "$val"
  done <"$server_env"
  ok "Synced keys from ${server_env} (server secrets excluded)"
}

ensure_mobile_env_defaults() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0

  _env_kv_or_default "$env_file" "DATABASE_URL" "postgresql://arciin:arciin@localhost:5432/arciin"
  _env_kv_or_default "$env_file" "ARCIIN_PG_PORT" "5432"
  _env_kv_or_default "$env_file" "REDIS_URL" "redis://localhost:6379"
  _env_kv_or_default "$env_file" "ARCIIN_DATA_DIR" "$ARCIIN_DEFAULT_STORAGE"
  _env_kv_or_default "$env_file" "SESSION_COOKIE_NAME" "arciin_session"
  _env_kv_or_default "$env_file" "MAX_UPLOAD_SIZE_MB" "20480"
  _env_kv_or_default "$env_file" "UPLOAD_RATE_LIMIT_PER_MINUTE" "500"
  _env_kv_or_default "$env_file" "LOG_MAX_FILE_BYTES" "1800000"
  _env_kv_or_default "$env_file" "API_PORT" "4000"
  _env_kv_or_default "$env_file" "ARCIIN_API_URL" "http://127.0.0.1:4000"
  _env_kv_or_default "$env_file" "NEXT_PUBLIC_API_BASE_URL" "/api"
  _env_kv_or_default "$env_file" "NEXT_PUBLIC_ARCIIN_API_ORIGIN" ""
  _env_kv_or_default "$env_file" "NEXT_PUBLIC_SOCKET_URL" ""
  _env_kv_or_default "$env_file" "ARCIIN_BIND_HOST" "0.0.0.0"
}

ensure_mobile_session_secret() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0
  if grep -q '^SESSION_SECRET=change-this-in-production' "$env_file" 2>/dev/null; then
    _set_env_kv "$env_file" "SESSION_SECRET" "$(_gen_secret)"
    ok "Generated SESSION_SECRET"
  fi
}

ensure_mobile_setup_token() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0
  if grep -qE '^ARCIIN_SETUP_TOKEN=(dev-token)?$' "$env_file" 2>/dev/null \
    || grep -q '^ARCIIN_SETUP_TOKEN=$' "$env_file" 2>/dev/null; then
    _set_env_kv "$env_file" "ARCIIN_SETUP_TOKEN" "$(openssl rand -hex 24 2>/dev/null || _gen_secret)"
    ok "Generated ARCIIN_SETUP_TOKEN"
  fi
}

ensure_mobile_production_secrets() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0

  _set_env_kv "$env_file" "NODE_ENV" "production"

  local secret_len
  secret_len="$(grep '^SESSION_SECRET=' "$env_file" 2>/dev/null | cut -d= -f2- | wc -c | tr -d ' ')"
  if grep -q '^SESSION_SECRET=change-this-in-production' "$env_file" 2>/dev/null \
    || [[ "${secret_len:-0}" -lt 32 ]]; then
    _set_env_kv "$env_file" "SESSION_SECRET" "$(_gen_secret)"
    ok "SESSION_SECRET secured (random)"
  fi

  if grep -qE '^ARCIIN_SETUP_TOKEN=(dev-token)?$' "$env_file" 2>/dev/null \
    || grep -q '^ARCIIN_SETUP_TOKEN=$' "$env_file" 2>/dev/null; then
    _set_env_kv "$env_file" "ARCIIN_SETUP_TOKEN" "$(openssl rand -hex 24 2>/dev/null || _gen_secret)"
    ok "ARCIIN_SETUP_TOKEN secured (random)"
  fi
}

_apply_mobile_ports_to_env() {
  local env_file="$1" lan_ip="$2" web_port="$3" api_port="$4"
  _set_env_kv "$env_file" "NODE_ENV" "production"
  _set_env_kv "$env_file" "PORT" "${web_port}"
  _set_env_kv "$env_file" "ARCIIN_MOBILE_PORT" "${web_port}"
  _set_env_kv "$env_file" "ARCIIN_BIND_HOST" "0.0.0.0"
  _set_env_kv "$env_file" "ARCIIN_PUBLIC_URL" "http://${lan_ip}:${web_port}"
  _set_env_kv "$env_file" "ARCIIN_API_URL" "http://127.0.0.1:${api_port}"
  _set_env_kv "$env_file" "API_PORT" "${api_port}"
  _set_env_kv "$env_file" "NEXT_PUBLIC_ARCIIN_API_ORIGIN" ""
  _set_env_kv "$env_file" "NEXT_PUBLIC_SOCKET_URL" ""
  _set_env_kv "$env_file" "NEXT_PUBLIC_API_BASE_URL" "/api"
  _set_env_kv "$env_file" "NEXT_PUBLIC_ARCIIN_PUBLIC_URL" "http://${lan_ip}:${web_port}"
  _set_env_kv "$env_file" "ARCIIN_MOBILE_DEV_ORIGINS" "${lan_ip}"
  if ! grep -q '^ARCIIN_DATA_DIR=' "$env_file" 2>/dev/null; then
    _set_env_kv "$env_file" "ARCIIN_DATA_DIR" "$ARCIIN_DEFAULT_STORAGE"
  fi
  if ! grep -q '^MAX_UPLOAD_SIZE_MB=' "$env_file" 2>/dev/null; then
    _set_env_kv "$env_file" "MAX_UPLOAD_SIZE_MB" "20480"
  fi
  if ! grep -q '^UPLOAD_RATE_LIMIT_PER_MINUTE=' "$env_file" 2>/dev/null; then
    _set_env_kv "$env_file" "UPLOAD_RATE_LIMIT_PER_MINUTE" "500"
  fi
  if ! grep -q '^LOG_MAX_FILE_BYTES=' "$env_file" 2>/dev/null; then
    _set_env_kv "$env_file" "LOG_MAX_FILE_BYTES" "1800000"
  fi
}

_server_desktop_web_port() {
  local server_dir="$1"
  local server_env="${server_dir}/.env"
  [[ -f "$server_env" ]] || return 1

  local port
  port="$(grep -oP '(?<=^ARCIIN_WEB_PORT=)\d+' "$server_env" 2>/dev/null | head -1 || true)"
  if [[ -n "$port" ]]; then
    echo "$port"
    return 0
  fi
  port="$(_env_public_url_port "$server_env")"
  if [[ -n "$port" ]]; then
    echo "$port"
    return 0
  fi
  return 1
}

# Mobile PWA listens on the port after the desktop web UI (3000 → mobile 3001, 3002 → 3003, …).
_mobile_port_sequence_start() {
  local server_dir="$1"
  local desktop_port
  desktop_port="$(_server_desktop_web_port "$server_dir" 2>/dev/null || true)"
  if [[ -n "$desktop_port" ]]; then
    echo $((desktop_port + 1))
    return 0
  fi
  # Desktop not installed yet — assume default web 3000, so mobile starts at 3001.
  echo 3001
}

_ufw_allow_mobile_port() {
  local port="$1"
  command -v ufw >/dev/null 2>&1 || return 0
  sudo ufw allow "${port}/tcp" comment "Arciin Mobile PWA" &>/dev/null || true
}

# Tell the Arciin API where the mobile PWA listens (remote access / tunnel target).
sync_mobile_ports_to_server() {
  local mobile_env="$1" server_dir="$2" lan_ip="$3" web_port="$4"
  local server_env="${server_dir}/.env"
  [[ -f "$server_env" ]] || return 0
  _set_env_kv "$server_env" "ARCIIN_MOBILE_PORT" "${web_port}"
  _set_env_kv "$server_env" "ARCIIN_MOBILE_PUBLIC_URL" "http://${lan_ip}:${web_port}"
  ok "Synced ARCIIN_MOBILE_* to ${server_env}"
}

configure_mobile_ports() {
  local env_file="$1" default_web_port="$2" default_api_port="$3"
  local server_dir="${4:-}"
  [[ -f "$env_file" ]] || return 0

  local lan_ip web_port api_port saved_api sequence_start saved_web desktop_port=""
  lan_ip="$(_detect_lan_ip)"
  sequence_start="$(_mobile_port_sequence_start "$server_dir")"
  saved_web="$(mobile_env_web_port "$env_file" "$sequence_start")"
  web_port="$saved_web"
  api_port="$(grep -oP '(?<=^API_PORT=)\d+' "$env_file" 2>/dev/null || true)"
  api_port="${api_port:-$default_api_port}"
  saved_api="$(grep -oP '(?<=^API_PORT=)\d+' "$env_file" 2>/dev/null || true)"

  if [[ "$web_port" -lt "$sequence_start" ]] || ! _port_available "$web_port"; then
    if ! _port_available "$web_port"; then
      warn "Port ${web_port} is in use — finding next free port from ${sequence_start}"
    else
      warn "Port ${web_port} is below desktop sequence — using ${sequence_start}+"
    fi
    web_port="$(_find_free_port "$sequence_start" 3099)"
  fi

  if [[ -n "$saved_api" ]]; then
    api_port="$saved_api"
  fi

  _apply_mobile_ports_to_env "$env_file" "$lan_ip" "$web_port" "$api_port"

  if [[ -n "$server_dir" && -f "${server_dir}/.env" ]]; then
    local desktop_public
    desktop_public="$(grep '^ARCIIN_PUBLIC_URL=' "${server_dir}/.env" 2>/dev/null | cut -d= -f2- || true)"
    if [[ -n "$desktop_public" ]]; then
      _set_env_kv "$env_file" "NEXT_PUBLIC_ARCIIN_DESKTOP_WEB_URL" "$desktop_public"
      ok "Desktop web URL for icons → ${desktop_public}"
    fi
  fi

  if [[ -n "$server_dir" ]]; then
    desktop_port="$(_server_desktop_web_port "$server_dir" 2>/dev/null || true)"
  fi
  if [[ -n "$desktop_port" ]]; then
    ok "Desktop web UI     → port ${desktop_port} (../arciin)"
  fi
  ok "Mobile PWA (LAN)   → http://${lan_ip}:${web_port}"
  ok "Mobile PWA (local) → http://localhost:${web_port}"
  ok "API (internal)     → http://127.0.0.1:${api_port} (browser uses http://${lan_ip}:${web_port}/api)"
}

finalize_mobile_ports_before_launch() {
  local env_file="$1" default_web_port="$2" default_api_port="$3"
  local server_dir="${4:-}"
  [[ -f "$env_file" ]] || return 0

  local lan_ip web_port api_port saved_web saved_api changed=false sequence_start
  lan_ip="$(_detect_lan_ip)"
  sequence_start="$(_mobile_port_sequence_start "$server_dir")"
  web_port="$(_env_public_url_port "$env_file")"
  web_port="${web_port:-$sequence_start}"
  api_port="$(grep -oP '(?<=^API_PORT=)\d+' "$env_file" 2>/dev/null || true)"
  api_port="${api_port:-$default_api_port}"

  saved_web="$web_port"
  saved_api="$api_port"

  while ! _port_available "$web_port"; do
    warn "Mobile port ${web_port} is taken — trying $((web_port + 1))"
    web_port=$((web_port + 1))
    changed=true
  done

  if [[ "$web_port" -lt "$sequence_start" ]]; then
    web_port="$(_find_free_port "$sequence_start" 3099)"
    changed=true
    warn "Mobile port was below desktop sequence — using ${web_port}"
  fi

  if [[ "$changed" == true ]]; then
    _apply_mobile_ports_to_env "$env_file" "$lan_ip" "$web_port" "$api_port"
    _ufw_allow_mobile_port "$web_port"
    ok "Ports finalized for launch — mobile ${web_port}"
  fi
}

purge_legacy_mobile_env_keys() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0
  sed -i \
    -e '/^NEXT_PUBLIC_ARCIIN_API_URL=/d' \
    -e '/^ARCIIN_SETUP_TOKEN_PREFILL=/d' \
    -e '/^NEXT_PUBLIC_ARCIIN_STANDALONE=/d' \
    -e '/^ARCIIN_MOBILE_BIND_HOST=/d' \
    "$env_file" 2>/dev/null || true
}

mobile_env_web_port() {
  local env_file="$1" fallback="${2:-3002}"
  local port
  port="$(grep -oP '(?<=^ARCIIN_MOBILE_PORT=)\d+' "$env_file" 2>/dev/null | head -1 || true)"
  if [[ -n "$port" ]]; then
    echo "$port"
    return
  fi
  port="$(_env_public_url_port "$env_file")"
  if [[ -n "$port" ]]; then
    echo "$port"
    return
  fi
  port="$(grep -oP '(?<=^PORT=)\d+' "$env_file" 2>/dev/null | head -1 || true)"
  if [[ -n "$port" ]]; then
    echo "$port"
    return
  fi
  echo "$fallback"
}

verify_mobile_api_health() {
  local env_file="$1" default_api_port="${2:-4000}"
  local api_url api_health
  api_url="$(grep '^ARCIIN_API_URL=' "$env_file" 2>/dev/null | cut -d= -f2- || true)"
  api_url="${api_url:-http://127.0.0.1:${default_api_port}}"
  api_health="${api_url%/}/api/health"
  if curl -sf "${api_health}" >/dev/null 2>&1; then
    ok "Arciin API detected at ${api_url}"
    return 0
  fi
  warn "Arciin API not reachable at ${api_health} — install ../arciin first if this is a fresh host"
  return 1
}
