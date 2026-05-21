import { isMobileAppHost, isPrivateLanHostname, normalizeApiBase } from "@/lib/connection/normalize-url"

/** True when the mobile UI is not served from the user's Arciin server origin. */
export function isPwaHostedApp(): boolean {
  if (typeof window === "undefined") return false
  try {
    return isMobileAppHost(new URL(window.location.origin).hostname)
  } catch {
    return false
  }
}

export function isPrivateLanApiBase(apiBaseUrl: string): boolean {
  try {
    const { hostname, protocol } = new URL(normalizeApiBase(apiBaseUrl))
    if (protocol !== "http:" && protocol !== "https:") return false
    return isPrivateLanHostname(hostname)
  } catch {
    return false
  }
}

/** LAN IPs are not reachable when the app UI and API are on different origins. */
export function lanBlockedFromHostedApp(apiBaseUrl: string): boolean {
  return isPwaHostedApp() && isPrivateLanApiBase(apiBaseUrl)
}

/** Examples of valid public addresses (no hosting vendor named). */
export const PUBLIC_SERVER_URL_EXAMPLES =
  "your own domain (https://archive.example.com) or a Cloudflare quick tunnel URL (https://….trycloudflare.com)"

export const HOSTED_APP_LAN_HINT =
  `A home LAN address (192.168.x.x) cannot be used here. Use a public HTTPS link instead — ${PUBLIC_SERVER_URL_EXAMPLES}. Copy it from desktop Arciin → Settings → Domain.`

/** Create-server step: how to connect when only public URLs work. */
export const HOSTED_APP_SETUP_NOTE =
  `Use From anywhere with a public HTTPS address for your Arciin server: ${PUBLIC_SERVER_URL_EXAMPLES}. Find or generate it in desktop Arciin → Settings → Domain.`

export const HOSTED_APP_REMOTE_INTRO =
  `Use your server’s public HTTPS URL — ${PUBLIC_SERVER_URL_EXAMPLES} — not a home LAN IP.`
