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

/** One line on create-server step when the app is hosted off the home network. */
export const HOSTED_APP_SETUP_NOTE =
  "Home network isn't available here. Use From anywhere with your public HTTPS address."

export const HOSTED_APP_REMOTE_INTRO = HOSTED_APP_SETUP_NOTE
