import { isMobileAppHost, isPrivateLanHostname, normalizeApiBase } from "@/lib/connection/normalize-url"

/** True when this UI is served from Vercel (not from the user's Arciin server). */
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

/** LAN IPs are not reachable from the Vercel-hosted PWA (browser + cloud proxy). */
export function lanBlockedFromHostedApp(apiBaseUrl: string): boolean {
  return isPwaHostedApp() && isPrivateLanApiBase(apiBaseUrl)
}

export const HOSTED_APP_LAN_HINT =
  "This app runs on arciin-app.vercel.app, not on your home server. A LAN address (192.168.x.x) cannot work here — copy the public HTTPS URL from desktop Arciin → Settings → Domain (trycloudflare.com or your domain), paste it below, then connect."
