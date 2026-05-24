import { arciinProxyHeaders, needsArciinSameOriginProxy } from "@/lib/api/arciin-proxy"
import { buildApiUrl, fetchApi } from "@/lib/api/client"
import { shouldUseArciinProxy } from "@/lib/api/proxy-fetch"
import {
  TEXT_PREVIEW_MAX_BYTES,
  TEXT_PREVIEW_MAX_CHARS,
} from "@/lib/files/is-text-previewable"
import type { MobileConnection } from "@/lib/types/api"
import type { AssetSummary, MediaType } from "@/lib/types/assets"

export type AssetSearchResult = {
  id: string
  originalFilename: string
  mimeType?: string | null
  libraryId?: string | null
}

export type AssetFilters = {
  libraryId?: string
  folderId?: string
  mediaType?: MediaType
  category?: "code" | "applications"
  search?: string
}

export function getAssets(
  connection: MobileConnection,
  filters: AssetFilters = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams()
  if (filters.libraryId) params.set("libraryId", filters.libraryId)
  if (filters.folderId) params.set("folderId", filters.folderId)
  if (filters.mediaType) params.set("mediaType", filters.mediaType)
  if (filters.category) params.set("category", filters.category)
  if (filters.search) params.set("search", filters.search)
  const query = params.size ? `?${params.toString()}` : ""

  return fetchApi<AssetSummary[]>(`/assets${query}`, { connection, signal })
}

export async function searchAssets(
  connection: MobileConnection,
  search: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ search: search.trim() })
  return fetchApi<AssetSearchResult[]>(`/assets?${params.toString()}`, {
    connection,
    signal,
  })
}

export function assetThumbnailUrl(connection: MobileConnection, assetId: string) {
  const params = new URLSearchParams({ access_token: connection.sessionToken })
  if (shouldUseArciinProxy(connection)) {
    return `/api/arciin/assets/${encodeURIComponent(assetId)}/thumbnail?${params.toString()}`
  }
  return buildApiUrl(
    connection.apiBaseUrl,
    `/assets/${assetId}/thumbnail?${params.toString()}`,
  )
}

export function assetDownloadUrl(
  connection: MobileConnection,
  assetId: string,
  inline = false,
) {
  return assetDownloadFetchUrl(connection, assetId, inline)
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
  return buildApiUrl(connection.apiBaseUrl, `/assets/${assetId}/download${q}`)
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

export async function fetchAssetTextContent(
  connection: MobileConnection,
  asset: Pick<AssetSummary, "id" | "sizeBytes">,
): Promise<{ text: string; truncated: boolean }> {
  if (asset.sizeBytes > TEXT_PREVIEW_MAX_BYTES) {
    throw new Error("too_large")
  }

  const res = await fetch(
    assetDownloadFetchUrl(connection, asset.id, true),
    assetDownloadRequestInit(connection),
  )
  if (!res.ok) throw new Error("fetch_failed")

  const buf = await res.arrayBuffer()
  if (buf.byteLength > TEXT_PREVIEW_MAX_BYTES) throw new Error("too_large")

  const text = new TextDecoder("utf-8", { fatal: false }).decode(buf)
  const truncated = text.length > TEXT_PREVIEW_MAX_CHARS
  return {
    text: truncated ? text.slice(0, TEXT_PREVIEW_MAX_CHARS) : text,
    truncated,
  }
}

/** Stream URL for `<audio>` / `<video>` when blob fetch is not used (large files). */
export function assetStreamUrl(connection: MobileConnection, assetId: string) {
  const params = new URLSearchParams({
    inline: "1",
    access_token: connection.sessionToken,
  })
  if (shouldUseArciinProxy(connection)) {
    // <video>/<audio> elements can't send custom headers, so embed api_base in the query
    // so the proxy route can extract it without the x-arciin-api-base header.
    params.set("api_base", btoa(connection.apiBaseUrl))
    return `/api/arciin/assets/${encodeURIComponent(assetId)}/download?${params.toString()}`
  }
  return buildApiUrl(connection.apiBaseUrl, `/assets/${assetId}/download?${params.toString()}`)
}

export function getAsset(connection: MobileConnection, assetId: string, signal?: AbortSignal) {
  return fetchApi<AssetSummary>(`/assets/${assetId}`, { connection, signal })
}

export function moveAsset(
  connection: MobileConnection,
  assetId: string,
  input: { libraryId?: string; folderId?: string | null },
) {
  const body: { libraryId?: string; folderId?: string | null } = {}
  if (input.libraryId !== undefined) body.libraryId = input.libraryId
  if (input.folderId !== undefined) body.folderId = input.folderId
  return fetchApi<AssetSummary>(`/assets/${assetId}/move`, {
    connection,
    method: "POST",
    body,
  })
}

export function deleteAsset(connection: MobileConnection, assetId: string) {
  return fetchApi<{ success: true }>(`/assets/${assetId}/delete`, {
    connection,
    method: "POST",
    body: {},
  })
}

export async function downloadAssetFile(
  connection: MobileConnection,
  asset: AssetSummary,
): Promise<void> {
  const url = assetDownloadUrl(connection, asset.id, false)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${connection.sessionToken}` },
  })
  if (!res.ok) throw new Error("Download failed")
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = asset.originalFilename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
