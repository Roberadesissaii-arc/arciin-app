import { getBrowserApiUrl } from "@/lib/api/browser-api-origin"
import { arciinProxyHeaders, needsArciinSameOriginProxy, resolveCoLocatedApiBase } from "@/lib/api/arciin-proxy"
import { buildApiUrl } from "@/lib/api/client"
import { shouldUseArciinProxy } from "@/lib/api/proxy-fetch"
import type { MobileConnection } from "@/lib/types/api"

function resolvedApiBase(connection: MobileConnection): string {
  return resolveCoLocatedApiBase(connection.apiBaseUrl)
}

function assetMediaQueryAuth(connection: MobileConnection) {
  const params = new URLSearchParams({
    access_token: connection.sessionToken,
  })
  if (shouldUseArciinProxy(connection)) {
    const apiBase = connection.apiBaseUrl.replace(/\/+$/, "")
    params.set("api_base", btoa(apiBase))
  }
  return params
}

function absoluteSameOriginUrl(path: string) {
  if (typeof window === "undefined") return path
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`
}

/** In-app deep link — opens the asset viewer (requires sign-in on this device). */
export function assetFilesViewUrl(assetId: string) {
  const path = `/files/view/${encodeURIComponent(assetId)}`
  return absoluteSameOriginUrl(path)
}

/**
 * Absolute inline media URL for <img>/<video>/<audio>.
 * Includes auth in the query so iOS long-press Share copies a working link (not a blob: URL).
 */
export function assetShareableMediaUrl(connection: MobileConnection, assetId: string) {
  const params = assetMediaQueryAuth(connection)
  params.set("inline", "1")

  if (shouldUseArciinProxy(connection)) {
    const path = `/api/arciin/assets/${encodeURIComponent(assetId)}/download?${params.toString()}`
    return absoluteSameOriginUrl(path)
  }

  if (typeof window !== "undefined") {
    return getBrowserApiUrl(`/assets/${assetId}/download?${params.toString()}`)
  }

  return buildApiUrl(
    resolvedApiBase(connection),
    `/assets/${assetId}/download?${params.toString()}`,
  )
}

export function assetThumbnailUrl(connection: MobileConnection, assetId: string) {
  const params = assetMediaQueryAuth(connection)
  if (shouldUseArciinProxy(connection)) {
    return `/api/arciin/assets/${encodeURIComponent(assetId)}/thumbnail?${params.toString()}`
  }
  if (typeof window !== "undefined") {
    return getBrowserApiUrl(`/assets/${assetId}/thumbnail?${params.toString()}`)
  }
  return buildApiUrl(
    resolvedApiBase(connection),
    `/assets/${assetId}/thumbnail?${params.toString()}`,
  )
}

/** URL for authenticated fetch (supports Vercel same-origin proxy). */
export function assetDownloadFetchUrl(
  connection: MobileConnection,
  assetId: string,
  inline = false,
) {
  const params = new URLSearchParams()
  if (inline) params.set("inline", "1")
  const q = params.size ? `?${params.toString()}` : ""
  if (shouldUseArciinProxy(connection)) {
    return `/api/arciin/assets/${encodeURIComponent(assetId)}/download${q}`
  }
  if (typeof window !== "undefined") {
    return getBrowserApiUrl(`/assets/${assetId}/download${q}`)
  }
  return buildApiUrl(resolvedApiBase(connection), `/assets/${assetId}/download${q}`)
}

export function assetDownloadRequestInit(connection: MobileConnection): RequestInit {
  const useProxy = needsArciinSameOriginProxy(connection.apiBaseUrl)
  return {
    headers: {
      Authorization: `Bearer ${connection.sessionToken}`,
      ...(useProxy ? arciinProxyHeaders(connection) : {}),
    },
    credentials: useProxy ? "same-origin" : "include",
    cache: "no-store",
  }
}
