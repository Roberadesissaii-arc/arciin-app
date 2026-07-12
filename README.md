# Arciin Mobile

**Your server, your control.** Arciin Mobile is a standalone Progressive Web App (PWA) for phones and tablets. Install it on your home screen, sign in to your self-hosted [Arciin](https://github.com/Roberadesissaii-arc/arciin) server, and manage files, AI chat, jobs, passwords, and settings — without an app store and without a cloud Arciin account.

This repo is the **mobile PWA host** (port **3002** by default). Your data, accounts, and files live on the **Arciin API** (port **4000**), installed from the sibling `arciin` repository.

---

## Table of contents

- [What you get](#what-you-get)
- [How it fits together](#how-it-fits-together)
- [Requirements](#requirements)
- [Install (recommended)](#install-recommended)
- [Install on your phone](#install-on-your-phone)
- [First sign-in](#first-sign-in)
- [Development](#development)
- [Environment variables](#environment-variables)
- [Operations (PM2)](#operations-pm2)
- [Authentication](#authentication)
- [Remote access](#remote-access)
- [Project structure](#project-structure)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Optional: deploy on Vercel](#optional-deploy-on-vercel)
- [Related repositories](#related-repositories)

---

## What you get

### Navigation

| Tab | What it does |
|-----|----------------|
| **Home** | Jobs, uploads, storage, password count, recent activity |
| **Files** | Libraries, folders, uploads, asset viewer (images, video, PDF, text) |
| **Chat** | Streaming AI chat using your server's model profiles |
| **Models** | View and switch chat profiles |
| **Profile** | Account, security, storage, integrations, password vault, API keys, and more |

### Standalone features (no desktop required)

| Feature | Notes |
|---------|--------|
| **Sign in** | Connect to your server URL, then sign in with your Arciin account |
| **File uploads** | Upload from device camera or gallery |
| **Password vault** | Add passwords or import CSV/JSON on mobile |
| **Profile settings** | Preferences, notifications, remote access, vault PIN, AI security |
| **Offline UX** | Single reconnect banner when the server is unreachable |

Notifications on mobile are the **activity inbox** (bell on Home), not desktop-style toast popups.

---

## How it fits together

```text
┌─────────────────────────┐         REST + WebSocket         ┌──────────────────────────┐
│  Arciin Mobile (this)   │  ──────────────────────────────► │  Arciin server (arciin)  │
│  PWA on :3002           │   Bearer session, files, chat    │  API on :4000            │
└─────────────────────────┘                                  │  PostgreSQL, Redis, etc. │
         ▲                                                     └──────────────────────────┘
         │ same Wi‑Fi or HTTPS
    📱 Phone / tablet
```

| Component | Repo | Default port | Role |
|-----------|------|--------------|------|
| **Mobile PWA** | `arciin-app` (this) | **3002** | Phone UI, PWA manifest, API proxy |
| **Arciin server** | `../arciin` | **4000** (API) | Files, auth, workers, database |

The mobile app does **not** install PostgreSQL or Redis. Those are part of the Arciin server install.

---

## Requirements

### For production install (`./install.sh`)

| Requirement | Version |
|-------------|---------|
| **OS** | Debian, Ubuntu, or WSL with `apt` |
| **Node.js** | 24+ (installer installs via NodeSource if needed) |
| **pnpm** | 10.32.1 (via Corepack) |
| **sudo** | Required for apt packages and optional UFW |
| **Arciin server** | Running and reachable at `http://<host>:4000/api` |

### For development only

- Node.js 20+ and pnpm 9+ work for `pnpm dev`, but production install pins Node 24 and pnpm 10.32.1.

---

## Install (recommended)

Clone this repo next to your Arciin server (sibling folders work best):

```text
projects/
├── arciin/          ← server (API, database, workers)
└── arciin-app/      ← mobile PWA (this repo)
```

### Option A — Mobile app only

Use this when the Arciin server is already running (same machine or another host on your network).

```bash
cd arciin-app
chmod +x install.sh
./install.sh
```

The installer will:

1. Install system packages (curl, git, build tools)
2. Install Node.js 24 and pnpm 10.32.1
3. Create `.env.local` with your LAN IP and API URL
4. Run `pnpm install` and `pnpm build`
5. Start the app under **PM2** as `arciin-mobile`
6. Open **UFW** port 3002 (unless skipped)

When prompted for **Arciin API URL**, enter your server's API base, for example:

```text
http://192.168.1.10:4000/api
```

If the API is running on the same machine, the installer auto-detects it.

### Option B — Mobile + Arciin server (fresh machine)

Install the server first, then mobile:

```bash
cd ../arciin && ./install.sh
cd ../arciin-app && ./install.sh
```

During mobile install, choose **Mobile + Arciin server** when asked — the script reminds you to run the server installer if `../arciin` is missing.

### Install flags

```bash
./install.sh              # Full production install (PM2)
./install.sh --dev        # Install deps, skip build/PM2, start dev server
./install.sh --skip-pm2   # Build only — no PM2 launch
./install.sh --help       # Full usage
```

### Install environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ARCIIN_MOBILE_PORT` | `3002` | PWA listen port |
| `ARCIIN_SERVER_DIR` | `../arciin` | Path to server repo (for tips) |
| `ARCIIN_MOBILE_SKIP_SYSTEM_PACKAGES=1` | — | Skip apt packages |
| `ARCIIN_MOBILE_SKIP_FIREWALL=1` | — | Skip UFW |
| `ARCIIN_MOBILE_SKIP_PM2=1` | — | Same as `--skip-pm2` |

### After install

```text
Mobile PWA (LAN):   http://<your-lan-ip>:3002
Mobile PWA (local): http://localhost:3002
Install helper:     http://<your-lan-ip>:3002/install
Sign in:            http://<your-lan-ip>:3002/sign-in
Arciin API:         http://<your-lan-ip>:4000/api
```

If the API is not reachable after install, start the server:

```bash
cd ../arciin && ./install.sh   # or: pm2 status
```

Then update `.env.local` and restart mobile:

```bash
# Edit NEXT_PUBLIC_ARCIIN_API_URL in .env.local
pnpm build && pm2 restart arciin-mobile
```

---

## Install on your phone

1. Connect phone and server to the **same Wi‑Fi** (or use a public HTTPS URL — see [Remote access](#remote-access)).
2. Open **`http://<server-lan-ip>:3002`** in Safari (iOS) or Chrome (Android).
3. Go to **`/install`** or tap **Install Arciin Mobile** when offered.
4. **Add to Home Screen**:
   - **iOS**: Share → Add to Home Screen
   - **Android**: Chrome menu → Install app (or use the native install prompt)
5. Open the home-screen icon — it runs in standalone mode (no browser chrome).

The PWA still needs your Arciin API running. Installing the icon does not install the server.

---

## First sign-in

1. Open the PWA → **`/connect`** if you have not saved a server yet.
2. Enter your Arciin server address (LAN IP or public URL).
3. Sign in at **`/sign-in`** with the email and password from your **server** setup.

First-run **instance claim** happens on the Arciin **server web app** (desktop browser at `http://<server>:3004/setup`), not in this mobile client.

Session lasts **90 days** by default (server configuration).

---

## Development

```bash
git clone https://github.com/Roberadesissaii-arc/arciin-app.git
cd arciin-app
pnpm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Your computer's LAN IP (so your phone can load dev fonts/HMR)
ARCIIN_MOBILE_DEV_ORIGINS=192.168.1.10

# Arciin API (start ../arciin first)
NEXT_PUBLIC_ARCIIN_API_URL=http://192.168.1.10:4000/api
```

Start the Arciin server (in `../arciin`), then:

```bash
pnpm dev --port 3002
```

On your phone (same Wi‑Fi): **`http://<lan-ip>:3002`**

Before committing or releasing:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

---

## Environment variables

Set in `.env.local` (created by `./install.sh` or copied from `.env.example`).

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_ARCIIN_API_URL` | **Yes** | Arciin API base, e.g. `http://192.168.1.10:4000/api` |
| `NEXT_PUBLIC_ARCIIN_STANDALONE` | No | `1` (default) — standalone app; `0` — legacy multi-server companion UI |
| `ARCIIN_MOBILE_PORT` | No | Production port (default `3002`) |
| `ARCIIN_MOBILE_BIND_HOST` | No | Bind address (default `0.0.0.0`) |
| `ARCIIN_MOBILE_DEV_ORIGINS` | Dev only | Comma-separated LAN IPs for Next.js `allowedDevOrigins` |

**Important:** `NEXT_PUBLIC_*` values are baked in at **build time**. After changing them:

```bash
pnpm build && pm2 restart arciin-mobile
```

Never commit `.env.local` — it may contain LAN addresses.

---

## Operations (PM2)

| Command | Description |
|---------|-------------|
| `pm2 status` | List processes |
| `pm2 logs arciin-mobile` | Tail mobile logs |
| `pm2 restart arciin-mobile` | Restart after rebuild |
| `bash start.sh` | Start via PM2 |
| `bash stop.sh` | Stop and remove PM2 process |

Logs are written to `logs/arciin-mobile-*.log`.

Production serves the built app via `scripts/run-mobile-prod.sh` → `next start -H 0.0.0.0 -p 3002`.

---

## Authentication

| Scenario | What to do |
|----------|------------|
| **First time on this phone** | Sign in (or complete `/setup` on a new instance) |
| **Same phone, later** | Open app → sign in if session expired |
| **Sign out** | Profile → Security → session cleared; sign in again |
| **LAN → public URL** | Profile → Remote access → update URL |
| **Revoke device** | Arciin server → Settings → Sessions |

The app stores a **Bearer session token** in browser storage — not your password.

---

## Remote access

- **On your network:** use `http://<lan-ip>:3002` for the PWA and `http://<lan-ip>:4000/api` for the API.
- **From anywhere:** expose the Arciin server with HTTPS (Cloudflare tunnel, reverse proxy, etc.) on the **server** side, then set `NEXT_PUBLIC_ARCIIN_API_URL` to the public API URL and rebuild.

Profile → **Remote access** can update the URL the phone uses without re-installing the PWA.

When offline, a **single banner** at the top explains the situation. Per-page errors are suppressed to avoid duplicate red messages.

---

## Project structure

```text
arciin-app/
├── app/                    # Next.js App Router routes
├── components/
│   ├── auth/               # Sign-in, setup, install PWA
│   ├── chat/               # AI chat
│   ├── files/              # Libraries, viewer, PDF
│   ├── home/               # Dashboard
│   ├── profile/            # Settings panels
│   └── shell/              # Nav, offline banner, headers
├── lib/
│   ├── api/                # Typed REST client
│   ├── connection/         # Sessions, reconnect, offline UX
│   └── standalone/         # Standalone API origin + bootstrap
├── public/                 # PWA manifest and icons
├── scripts/
│   ├── lib/mobile-install-lib.sh
│   └── run-mobile-prod.sh
├── install.sh              # Production installer
├── start.sh / stop.sh      # PM2 helpers
└── ecosystem.config.cjs    # PM2 config
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `./install.sh` | Full production install |
| `./install.sh --dev` | Dev mode after install steps |
| `pnpm dev` | Dev server on `0.0.0.0` (default Next port unless `--port` set) |
| `pnpm dev --port 3002` | Dev on production port |
| `pnpm build` | Production build |
| `pnpm start` | Run production server (after build) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **Could not reach server** | Confirm Arciin API is up: `curl http://<host>:4000/api/health`. Check Wi‑Fi, firewall, and `NEXT_PUBLIC_ARCIIN_API_URL`. |
| **Phone cannot open :3002** | Open UFW: `sudo ufw allow 3002/tcp`. Confirm `pm2 status` shows `arciin-mobile` online. |
| **API URL wrong after install** | Edit `.env.local` → `pnpm build && pm2 restart arciin-mobile`. |
| **Fonts / 403 in dev on phone** | Set `ARCIIN_MOBILE_DEV_ORIGINS` to your phone-reachable LAN IP; use `pnpm dev --port 3002`. |
| **Blank page after deploy** | Run `pnpm build` before `next start`. Check `logs/arciin-mobile-err.log`. |
| **`localhost` on phone fails** | Use the server's **LAN IP**, not `localhost`. |
| **Install script needs sudo** | Normal — apt and UFW require it. Do not run the script as root. |
| **Port 3002 in use** | Installer picks next free port in 3002–3099 and writes it to `.env.local`. |
| **Password vault empty** | Tap **+** on Passwords to add or import — no desktop required. |

### Health checks

```bash
# API
curl -s http://127.0.0.1:4000/api/health | jq .

# Mobile (after install)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3002/
```

---

## Optional: deploy on Vercel

You can host the PWA on Vercel for users who do not self-host the mobile shell. **Files and accounts still live on the user's Arciin server.**

1. Import this repo in [Vercel](https://vercel.com)
2. Framework: **Next.js** — Build: `pnpm build` — Install: `pnpm install`
3. Set `NEXT_PUBLIC_ARCIIN_API_URL` to the user's API (or leave unset and rely on standalone bootstrap from browser origin — only works if API is same-origin)

Self-hosted `install.sh` is the recommended path for homelab and LAN use.

---

## Related repositories

| Repo | Role |
|------|------|
| **[Arciin](https://github.com/Roberadesissaii-arc/arciin)** | Self-hosted server — API, web UI, workers, database |
| **arciin-app** (this repo) | Standalone mobile PWA |

Update **both** repos together when releasing major versions so mobile APIs, chat, and PDF features stay aligned.

---

## License

Private / project-specific — see repository settings or owner for license terms.

---

<p align="center">
  <strong>Arciin Mobile</strong> — your pocket console for the server you own.<br />
  Server: <a href="https://github.com/Roberadesissaii-arc/arciin">Arciin</a>
</p>
