import { getBrowserApiUrl } from "@/lib/api/browser-api-origin"
import {
  ARCIIN_API_BASE_HEADER,
  needsArciinSameOriginProxy,
  resolveCoLocatedApiBase,
} from "@/lib/api/arciin-proxy"
import { normalizeApiBase } from "@/lib/connection/normalize-url"
import { isStandaloneApp } from "@/lib/standalone/config"
import type { MobileConnection } from "@/lib/types/api"

/** Load a user's profile image bytes from the shared Arciin instance. */
export async function fetchUserAvatarBlob(
  connection: MobileConnection,
  userId: string,
  cacheKey?: string,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${connection.sessionToken}`,
  }

  const query = new URLSearchParams({ userId })
  if (cacheKey) query.set("v", cacheKey)

  if (typeof window !== "undefined" && needsArciinSameOriginProxy(connection.apiBaseUrl)) {
    try {
      const res = await fetch(`/api/user-avatar?${query.toString()}`, {
        headers: {
          ...headers,
          [ARCIIN_API_BASE_HEADER]: normalizeApiBase(connection.apiBaseUrl).replace(/\/+$/, ""),
        },
        signal,
        cache: "no-store",
        credentials: "same-origin",
      })
      if (res.ok) return res.blob()
      if (res.status === 404) return null
    } catch {
      /* try direct fallbacks below */
    }
  }

  const path = `/auth/users/${encodeURIComponent(userId)}/avatar`
  const directUrl =
    typeof window !== "undefined" && isStandaloneApp()
      ? getBrowserApiUrl(
          cacheKey
            ? `${path}?v=${encodeURIComponent(cacheKey)}`
            : path,
        )
      : (() => {
          const apiBase = resolveCoLocatedApiBase(connection.apiBaseUrl).replace(/\/+$/, "")
          return cacheKey
            ? `${apiBase}${path}?v=${encodeURIComponent(cacheKey)}`
            : `${apiBase}${path}`
        })()

  try {
    const res = await fetch(directUrl, { headers, signal, cache: "no-store" })
    if (res.ok) return res.blob()
    if (res.status === 404) return null
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
