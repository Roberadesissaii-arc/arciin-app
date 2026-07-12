/** Next.js dev / standalone mobile PWA ports (not the Arciin API or desktop web). */
export function isMobileDevServerPort(port: string | number | undefined): boolean {
  if (port === undefined || port === "") return false
  const n = typeof port === "number" ? port : Number.parseInt(port, 10)
  return Number.isFinite(n) && n >= 3000 && n < 3100
}

export function isSameOriginAsMobileApp(url: string): boolean {
  if (typeof window === "undefined") return false
  try {
    return new URL(url).origin === window.location.origin
  } catch {
    return false
  }
}

/**
 * True when a URL is this installed PWA tab or a hosted companion host — not a
 * LAN/server address other phones should use (e.g. http://192.168.x.x:3003).
 */
export function isLikelyMobilePwaUrl(url: string | null | undefined): boolean {
  const raw = url?.trim()
  if (!raw) return false
  if (isSameOriginAsMobileApp(raw)) return true
  try {
    const host = new URL(raw).hostname.toLowerCase()
    return host.endsWith(".vercel.app") || host === "vercel.app"
  } catch {
    return false
  }
}
