/** Build an absolute avatar URL for mobile (API base is remote, not same-origin). */
export function resolveUserAvatarUrl(
  apiBaseUrl: string,
  avatarUrl: string | null | undefined,
  cacheKey?: string,
): string | null {
  if (!avatarUrl?.trim()) return null

  let path = avatarUrl.trim()
  if (path.startsWith("http://") || path.startsWith("https://")) {
    // already absolute
  } else {
    if (!path.startsWith("/")) {
      path = path.startsWith("api/") ? `/${path}` : `/api/${path.replace(/^\/?api\//, "")}`
    }
    const base = apiBaseUrl.replace(/\/+$/, "")
    const origin = base.endsWith("/api") ? base.slice(0, -4) : base
    path = `${origin}${path}`
  }

  if (!cacheKey) return path
  const sep = path.includes("?") ? "&" : "?"
  return `${path}${sep}v=${encodeURIComponent(cacheKey)}`
}
