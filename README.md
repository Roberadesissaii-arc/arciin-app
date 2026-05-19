# Arciin Mobile

A self-hosted companion PWA for [Arciin](https://github.com/Roberadesissaii-arc/arciin) — your private file, library, and media server. Install it on your phone, connect to **your** Arciin instance, and manage libraries, uploads, activity, and settings from anywhere you can reach your server.

**Your server, your control.** The mobile app does not use a cloud Arciin account. It talks directly to the Arciin API you run at home (or on your VPS).

---

## What it does

- **Connect** to an Arciin server on your LAN or over HTTPS (domain, reverse proxy, or tunnel)
- **Pair once per phone** with a short code from the desktop (Settings → Mobile connection), then **sign in** with email and password
- Browse **files**, **libraries**, **uploads**, **jobs**, and **activity**
- **Profile & settings**: storage, remote access, API keys, integrations, security sessions, password vault, AI models
- **Reconnect** when the server address changes (new tunnel or domain) without re-pairing, when your session is still valid
- Optional **realtime** updates via Socket.IO when the server exposes it

---

## Architecture

```
┌─────────────────────┐         HTTPS / LAN          ┌──────────────────────┐
│  Arciin Mobile PWA  │  ──────────────────────────► │  Your Arciin server  │
│  (Vercel / static)  │   Bearer session + REST API    │  Next.js + Fastify   │
└─────────────────────┘                              └──────────────────────┘
```

| Piece | Where it runs | Example |
|-------|----------------|---------|
| **This app** | Vercel, Netlify, or `pnpm start` | `https://app.example.com` |
| **Arciin server** | Your machine / Docker | `https://arciin.example.com` or `http://192.168.1.10:3004` |

The PWA only needs to know the **server base URL**. Deploying the app on Vercel does not replace hosting Arciin itself.

---

## Requirements

- **Node.js** 20+ and **pnpm** 9+
- A running **Arciin** instance (claimed, with at least one user)
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

On your phone (same Wi‑Fi), open `http://<your-lan-ip>:3000` (or the port Next prints).

### Connect the app to Arciin

1. On the **server**: Arciin web → **Settings → Mobile connection** → **Generate connection code**
2. On the **phone**: **Connect to a server** → enter server address:
   - **On my network**: `192.168.x.x` (and port if not 3000), or
   - **From anywhere**: `https://your-public-url`
3. Enter the **6-digit code**, your Arciin **email** and **password**
4. You land in the app; next time use **Sign in** only (no code)

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Local dev (localhost) |
| `pnpm dev:mobile` | Dev on `0.0.0.0` for phone testing |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint (`app`, `components`, `lib`) |
| `pnpm typecheck` | TypeScript check |

---

## Deploy on Vercel

1. Import this repository in [Vercel](https://vercel.com)
2. Framework preset: **Next.js**
3. Build command: `pnpm build` — install: `pnpm install`
4. No server URL is baked in at build time; each user enters their Arciin server on first launch

Optional environment variables:

| Variable | Purpose |
|----------|---------|
| `ARCIIN_MOBILE_DEV_ORIGINS` | Only for local dev — LAN IPs allowed for Next.js dev assets |

Users still configure **which Arciin server** to use inside the app (sign-in / Profile → Remote access).

---

## Authentication model

| Scenario | What you do |
|----------|-------------|
| **First time on this phone** | Server URL + **pairing code** + email/password |
| **Same phone, later** | **Sign in** (email/password only) |
| **Sign out** | Session cleared; server address kept → sign in again, no code |
| **New phone** | Pair once with a new code from the server |
| **Change LAN → public URL** | Profile → **Remote access** or Sign in → **Change server** → paste URL → reconnect (no code if session valid) |
| **Revoke device on server** | Settings → Mobile connection → remove session → phone must sign in again |

Pairing proves an admin allowed the device. The app stores an opaque **Bearer session token** (not your password). Sessions last **90 days** by default (server configuration).

---

## Remote access (LAN vs public)

- **On your network**: use the server’s LAN URL while on the same Wi‑Fi.
- **From anywhere**: use the server’s public HTTPS URL (your domain, reverse proxy, or tunnel URL from **desktop** Arciin → Settings → Domain).

The mobile app does **not** start Cloudflare tunnels. Generate public URLs on the **Arciin server** desktop UI, then paste them in the mobile app if needed.

If the server is unreachable, a banner links to **Profile → Remote access** to update the address.

---

## Project structure

```
app/              Next.js App Router (routes, layouts)
components/       UI, auth, shell, profile, files, uploads
lib/
  api/            Typed REST client (Bearer auth)
  connection/     Server profile, session storage, reconnect
  hooks/          Foreground refresh, panel loading
public/           PWA icons, manifest assets
```

---

## API surface (server)

The app expects a standard Arciin API, including:

- `GET /api/mobile/discover`
- `POST /api/mobile/pair`
- `POST /api/mobile/login`
- `GET /api/auth/me`
- Plus libraries, assets, uploads, settings, etc.

See the main [Arciin](https://github.com/Roberadesissaii-arc/arciin) repo and `docs/MOBILE_CLIENT.md` for the full contract.

---

## Security notes

- Never commit `.env.local` or secrets.
- Sessions are sent as `Authorization: Bearer <token>` to the user’s server only.
- Use HTTPS for public access; treat quick tunnel URLs as temporary.
- Revoke lost devices from the server’s **Mobile connection** screen.

---

## Troubleshooting

| Problem | Try |
|---------|-----|
| **Could not reach server** | Confirm Arciin is running; check URL, Wi‑Fi, or tunnel; update address under Profile → Remote access |
| **Sign-in fails after sign-out** | Use the correct server URL (LAN vs public); ensure you are not saving `localhost` on the phone |
| **Pairing code invalid** | Generate a new code on the server (10-minute TTL, single use) |
| **Fonts / 403 in dev on phone** | Set `ARCIIN_MOBILE_DEV_ORIGINS` and use `pnpm dev:mobile` |
| **CORS errors** | Server must allow your PWA origin; Arciin API reflects origins for self-hosted instances |

---

## Related repositories

- **[Arciin](https://github.com/Roberadesissaii-arc/arciin)** — self-hosted server (web UI, API, workers)

---

## License

Private / project-specific — see repository settings or owner for license terms.
