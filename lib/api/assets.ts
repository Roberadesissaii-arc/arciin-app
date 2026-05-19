import { fetchApi } from "@/lib/api/client"
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
  const base = connection.apiBaseUrl.replace(/\/+$/, "")
  return `${base}/assets/${assetId}/thumbnail`
}

export function assetDownloadUrl(
  connection: MobileConnection,
  assetId: string,
  inline = false,
) {
  const base = connection.apiBaseUrl.replace(/\/+$/, "")
  const q = inline ? "?inline=1" : ""
  return `${base}/assets/${assetId}/download${q}`
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
