/** Build an absolute avatar URL for mobile (API base is remote, not same-origin). */
export function resolveUserAvatarUrl(
  apiBaseUrl: string,
  avatarUrl: string | null | undefined,
  cacheKey?: string,
): string | null {
  if (!avatarUrl?.trim()) return null

  let path = avatarUrl.trim()
  if (!path.startsWith("http://") && !path.startsWith("https://")) {
    const apiBase = apiBaseUrl.replace(/\/+$/, "")
    const normalized = path.startsWith("/") ? path : `/${path}`
    if (normalized.startsWith("/api/")) {
      path = apiBase.endsWith("/api")
        ? `${apiBase}${normalized.slice(4)}`
        : `${apiBase}${normalized}`
    } else {
      path = `${apiBase}${normalized}`
    }
  }

  if (!cacheKey) return path
  const sep = path.includes("?") ? "&" : "?"
  return `${path}${sep}v=${encodeURIComponent(cacheKey)}`
}
