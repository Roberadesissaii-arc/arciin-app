import type { MobileConnection } from "@/lib/types/api"

/** Load the signed-in user's profile image bytes from the instance API. */
export async function fetchUserAvatarBlob(
  connection: MobileConnection,
  userId: string,
  cacheKey?: string,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const apiBase = connection.apiBaseUrl.replace(/\/+$/, "")
  const path = `/auth/users/${encodeURIComponent(userId)}/avatar`
  const url = cacheKey
    ? `${apiBase}${path}?v=${encodeURIComponent(cacheKey)}`
    : `${apiBase}${path}`

  const headers = { Authorization: `Bearer ${connection.sessionToken}` }

  try {
    const res = await fetch(url, { headers, signal, cache: "no-store" })
    if (res.ok) return res.blob()
  } catch {
    /* try web origin */
  }

  const web = connection.webUrl?.replace(/\/+$/, "")
  if (!web) return null

  const webUrl = cacheKey
    ? `${web}/api/auth/users/${encodeURIComponent(userId)}/avatar?v=${encodeURIComponent(cacheKey)}`
    : `${web}/api/auth/users/${encodeURIComponent(userId)}/avatar`

  try {
    const res = await fetch(webUrl, { headers, signal, cache: "no-store" })
    if (!res.ok) return null
    return res.blob()
  } catch {
    return null
  }
}
