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

export const HOSTED_APP_LAN_HINT =
  "Home network is not available here. Use From anywhere with a public HTTPS address."

export const HOSTED_APP_SETUP_NOTE = HOSTED_APP_LAN_HINT

export const HOSTED_APP_REMOTE_INTRO =
  "Use your public HTTPS address — not home LAN."
