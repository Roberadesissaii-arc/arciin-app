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

/** True when a saved URL points at this phone app, not the Arciin server. */
export function isLikelyMobilePwaUrl(url: string | null | undefined): boolean {
  const raw = url?.trim()
  if (!raw) return false
  if (isSameOriginAsMobileApp(raw)) return true
  try {
    return isMobileDevServerPort(new URL(raw).port)
  } catch {
    return false
  }
}
