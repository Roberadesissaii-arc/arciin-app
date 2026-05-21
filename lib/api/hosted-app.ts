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

export function lanBlockedFromHostedApp(apiBaseUrl: string): boolean {
  return isPwaHostedApp() && isPrivateLanApiBase(apiBaseUrl)
}

/** Shown when user picks home LAN on the hosted install. */
export const HOSTED_APP_LAN_HINT =
  "Home network is not available in this app. Use From anywhere with your server's public HTTPS address."

/** Setup step — explains why only one connection mode works here. */
export const HOSTED_APP_SETUP_NOTE =
  "Only From anywhere is available here (1 of 2 connection modes). Home LAN does not work from this install — use your public HTTPS address from Settings → Domain on your Arciin server."

export const HOSTED_APP_REMOTE_INTRO =
  "This install cannot reach your home LAN. Use From anywhere with your public HTTPS address (Settings → Domain on desktop)."
