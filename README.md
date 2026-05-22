# Arciin Mobile

A production-ready companion PWA for **[Arciin](https://github.com/Roberadesissaii-arc/arciin)** — your self-hosted private file, library, and media server. Install it on your phone, **pair once** with your desktop server, and manage libraries, uploads, AI chat, and settings from anywhere you can reach your instance.

**Your server, your control.** This app does not use a cloud Arciin account. It talks only to the Arciin API you run (home server, NAS, or VPS).

---

## Table of contents

- [What you get](#what-you-get)
- [Pair with your Arciin server](#pair-with-your-arciin-server)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Quick start (development)](#quick-start-development)
- [Scripts](#scripts)
- [Deploy on Vercel](#deploy-on-vercel)
- [Authentication](#authentication)
- [Remote access](#remote-access)
- [Project structure](#project-structure)
- [API surface](#api-surface)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Related repositories](#related-repositories)

---

## What you get

### Navigation & shell

| Screen | Description |
|--------|-------------|
| **Home** | Instance overview — jobs, uploads, storage, passwords count, recent activity |
| **Files** | Browse libraries, folders, assets; grid view; upload from the phone |
| **Chat** | Streaming AI chat against your server’s configured models (Ollama / cloud profiles) |
| **Models** | View and switch active chat profiles; connect providers |
| **Profile** | Account, server management, and deep settings |

Bottom navigation: **Home · Files · Chat · Models · Profile**

### Files & media

| Feature | Description |
|---------|-------------|
| **Libraries** | Videos, Images, Music, Documents, Inbox — same structure as desktop |
| **Folders** | Create, rename, move assets |
| **Uploads** | Pick files from the device; progress and errors surfaced clearly |
| **Asset viewer** | Open images, video, PDF, and text/code previews |
| **PDF viewer** | Scroll PDFs on device with mobile-optimized chrome |
| **Search** | Quick search from the home header |

### AI

| Feature | Description |
|---------|-------------|
| **AI Chat** | Full-screen chat with model picker, streaming, speech-to-text input |
| **Offline chat UX** | When the server is down: connect CTA, no duplicate error banners on every screen |
| **Welcome suggestions** | Quick prompts when online (including “List my documents”) |
| **Models page** | Enable profiles created on the desktop server |

Chat uses the same Arciin API and model profiles as the desktop **Chat** page — not a separate cloud backend.

### Operations & activity

| Feature | Description |
|---------|-------------|
| **Jobs** | Background job list and status |
| **Activity** | Event feed aligned with desktop activity |
| **Notifications** | Activity inbox (bell on Home) — uploads, assets, security-related events |
| **Events** | Live-style monitor for Socket.IO events when the server is reachable |

Notifications on mobile are the **activity feed**, not desktop-style toast popups. Toast preferences live on the server; the mobile app surfaces events in the notifications list.

### Profile & settings

| Area | Description |
|------|-------------|
| **Profile card** | Avatar, name, role, file/library counts (hidden when server offline) |
| **Change server** | Switch saved servers, probe reachability, remove accounts |
| **Remote access** | Update public URL or LAN address when tunnels change |
| **Storage** | View usage and storage settings |
| **Security** | Sessions and sign-out |
| **API keys** | List and manage developer keys |
| **Integrations** | Plex/Jellyfin-style cards (status from server) |
| **Password vault** | Encrypted entries (when enabled on server) |
| **Database** | Browse tables and app-data (admin) |
| **Preferences** | User preferences from the server |
| **Activity notifications** | Link to the notifications feed (not separate toast toggles) |

### Connection UX

| Feature | Description |
|---------|-------------|
| **Pairing** | 6-digit code from desktop **Settings → Mobile connection** |
| **Sign in** | Email/password after pairing; 90-day sessions (server default) |
| **Reconnect banner** | Single top banner when offline — per-page “could not reach server” errors suppressed |
| **Multi-server** | Save multiple Arciin servers on one phone |
| **Foreground refresh** | Re-sync when returning to the app |

---

## Pair with your Arciin server

You need a **running Arciin desktop/server** install before this app is useful.

```text
┌─────────────────────┐     pairing code      ┌──────────────────────┐
│  Arciin (desktop)   │ ────────────────────► │  Arciin Mobile PWA   │
│  Settings → Mobile  │     + email/password  │  (this repository) │
└─────────────────────┘                       └──────────────────────┘
```

| Step | Desktop (arciin) | Mobile (this app) |
|------|------------------|-------------------|
| 1 | Install & claim instance | — |
| 2 | **Settings → Mobile connection → Generate code** | — |
| 3 | — | **Connect to a server** → enter LAN or HTTPS URL |
| 4 | — | Enter **6-digit code** + email + password |
| 5 | Revoke devices from same screen if needed | **Sign in** next time (no code) |

If you change from LAN to a public URL (tunnel/domain), update **Profile → Remote access** on the phone — no new pairing code if your session is still valid.

---

## Architecture

```
┌─────────────────────┐         HTTPS / LAN          ┌──────────────────────┐
│  Arciin Mobile PWA  │  ──────────────────────────► │  Your Arciin server  │
│  (Vercel / static)  │   Bearer session + REST API  │  (arciin repository) │
└─────────────────────┘                              └──────────────────────┘
```

| Piece | Where it runs | Example |
|-------|----------------|---------|
| **This app** | Vercel, Netlify, or `pnpm start` | `https://your-pwa.example.com` |
| **Arciin server** | Your machine / Docker | `https://arciin.example.com` or `http://192.168.1.10:3004` |

Deploying the PWA on Vercel does **not** host your files — only the mobile UI. All data stays on your Arciin server.

---

## Requirements

- **Node.js** 20+ and **pnpm** 9+
- A running **Arciin** server (claimed, with at least one user and model profiles for chat)
- For first-time pairing: admin access on the server to generate a **6-digit connection code**

---

## Quick start (development)

```bash
git clone https://github.com/Roberadesissaii-arc/arciin-app.git
cd arciin-app
pnpm install
cp .env.local.example .env.local
```

Edit `.env.local` — set `ARCIIN_MOBILE_DEV_ORIGINS` to your computer’s LAN IP (comma-separated if several):

```env
ARCIIN_MOBILE_DEV_ORIGINS=192.168.1.100
```

Start the dev server bound to all interfaces (so your phone can open it):

```bash
pnpm dev:mobile
```

On your phone (same Wi‑Fi), open `http://<your-lan-ip>:3000`.

### Connect to Arciin

1. On the **server**: Arciin web → **Settings → Mobile connection** → **Generate connection code**
2. On the **phone**: open this PWA → **Connect to a server** → enter:
   - **On my network**: `http://192.168.x.x:3004` (or your web port)
   - **From anywhere**: `https://your-public-url`
3. Enter the **6-digit code**, your Arciin **email** and **password**
4. Next launches use **Sign in** only (no code)

---

## Browser & PWA icons

The tab bar and “Add to Home Screen” use the Arciin mark (black tile + orange arch):

| File | Use |
|------|-----|
| `favicon.svg` | Modern browsers (tab icon) |
| `favicon.ico` / `favicon-32.png` | Legacy tab shortcut |
| `apple-touch-icon.png` | iOS home screen |
| `icon-192.png` / `icon-512.png` | PWA manifest |

Regenerate from the desktop repo (requires Sharp):

```bash
cd ../arciin && pnpm icons:generate
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Local dev (localhost) |
| `pnpm dev:mobile` | Dev on `0.0.0.0` for phone testing |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint (`app`, `components`, `lib`) |
| `pnpm typecheck` | TypeScript check |

Before release:

```bash
pnpm typecheck
pnpm build
```

---

## Deploy on Vercel

1. Import this repository in [Vercel](https://vercel.com)
2. Framework preset: **Next.js**
3. Build command: `pnpm build` — Install command: `pnpm install`
4. No server URL is baked in at build time; each user enters their Arciin server on first launch

Optional environment variables:

| Variable | Purpose |
|----------|---------|
| `ARCIIN_MOBILE_DEV_ORIGINS` | Local dev only — LAN IPs allowed for Next.js dev assets |

Users configure **which Arciin server** to use inside the app (sign-in / Profile → Remote access).

---

## Authentication

| Scenario | What you do |
|----------|-------------|
| **First time on this phone** | Server URL + **pairing code** + email/password |
| **Same phone, later** | **Sign in** (email/password only) |
| **Sign out** | Session cleared; server address kept → sign in again, no code |
| **New phone** | Pair once with a new code from the server |
| **LAN → public URL** | Profile → **Remote access** or **Change server** → paste URL → reconnect |
| **Revoke device on server** | Desktop → Mobile connection → remove session |

The app stores an opaque **Bearer session token** (not your password). Sessions last **90 days** by default (server configuration).

---

## Remote access

- **On your network**: use the server’s LAN URL while on the same Wi‑Fi.
- **From anywhere**: use the server’s public HTTPS URL from **desktop** Arciin → **Settings → Domain** (tunnel or reverse proxy).

The mobile app does **not** start tunnels. Generate public URLs on the **Arciin server**, then paste them in the mobile app if needed.

When the server is unreachable, a **single banner** at the top explains the situation and links to **Profile** to update the address. Profile hides cached name/email until the server is back online.

---

## Project structure

```text
arciin-app/
├── app/                 # Next.js App Router (routes, API proxy)
├── components/
│   ├── auth/            # Sign-in, pairing
│   ├── chat/            # AI chat, model bar, markdown
│   ├── files/           # Libraries, viewer, PDF
│   ├── home/            # Overview
│   ├── notifications/   # Activity inbox
│   ├── profile/         # Settings panels
│   └── shell/           # Nav, offline banner, headers
├── lib/
│   ├── api/             # Typed REST client (Bearer auth)
│   ├── connection/      # Server profile, sessions, reconnect, offline UX
│   └── hooks/           # Foreground refresh, cached panels
└── public/              # PWA manifest and icons
```

---

## API surface

The app expects a standard Arciin API, including:

- `GET /api/mobile/discover`
- `POST /api/mobile/pair`
- `POST /api/mobile/login`
- `GET /api/auth/me`
- Libraries, assets, folders, uploads, jobs, activity, chat stream, settings, etc.

See the main **[Arciin](https://github.com/Roberadesissaii-arc/arciin)** repo and `docs/MOBILE_CLIENT.md` (if present) for the full contract. Server and mobile should be updated together for new API features.

---

## Security

- Never commit `.env.local` or secrets.
- Sessions are sent as `Authorization: Bearer <token>` to the user’s server only.
- Use HTTPS for public access; treat quick tunnel URLs as temporary.
- Revoke lost devices from the server’s **Mobile connection** screen.

---

## Troubleshooting

| Problem | Try |
|---------|-----|
| **Could not reach server** | Confirm Arciin is running; check URL, Wi‑Fi, or tunnel; update **Profile → Remote access** |
| **Red error on every page** | Should only see the top offline banner — pull latest mobile build |
| **Profile still shows my name offline** | Pull latest — name/email hidden until server reconnects |
| **Sign-in fails after sign-out** | Use correct server URL (LAN vs public); avoid `localhost` on the phone |
| **Pairing code invalid** | Generate a new code on the server (short TTL, single use) |
| **Chat says connect server** | Expected when offline; reconnect via banner |
| **Fonts / 403 in dev on phone** | Set `ARCIIN_MOBILE_DEV_ORIGINS` and use `pnpm dev:mobile` |
| **CORS errors** | Server must allow your PWA origin |

---

## Related repositories

| Repo | Role |
|------|------|
| **[Arciin](https://github.com/Roberadesissaii-arc/arciin)** | Self-hosted server — web UI, API, workers, mobile pairing codes |
| **arciin-app** (this repo) | Companion PWA for iOS/Android/home-screen install |

**Production pairing:** deploy or update **both** repos when releasing a major version so chat, PDF, and mobile APIs stay aligned.

---

## License

Private / project-specific — see repository settings or owner for license terms.

---

<p align="center">
  <strong>Arciin Mobile</strong> — your pocket console for the server you own.<br />
  Server: <a href="https://github.com/Roberadesissaii-arc/arciin">Arciin</a>
</p>
