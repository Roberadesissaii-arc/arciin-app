import { fetchApi } from "@/lib/api/client"
import {
  assetDownloadFetchUrl,
  assetDownloadRequestInit,
  assetFilesViewUrl,
  assetShareableMediaUrl,
  assetThumbnailUrl,
} from "@/lib/api/asset-media-urls"
import { fetchAssetBlob } from "@/lib/api/asset-binary"
import {
  beginDownloadAsset,
  beginShareAsset,
  downloadAssetFile,
  shareAssetFile,
} from "@/lib/api/asset-share-download"
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

export {
  assetDownloadFetchUrl,
  assetDownloadRequestInit,
  assetFilesViewUrl,
  assetShareableMediaUrl,
  assetThumbnailUrl,
  beginDownloadAsset,
  beginShareAsset,
  downloadAssetFile,
  fetchAssetBlob,
  shareAssetFile,
}
export type { DownloadAssetResult, ShareAssetResult } from "@/lib/api/asset-share-download"

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

export function assetDownloadUrl(
  connection: MobileConnection,
  assetId: string,
  inline = false,
) {
  return assetDownloadFetchUrl(connection, assetId, inline)
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

/** Stream URL for `<audio>` / `<video>` (alias — always absolute when proxied). */
export function assetStreamUrl(connection: MobileConnection, assetId: string) {
  return assetShareableMediaUrl(connection, assetId)
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

export type DuplicateHit = { filename: string; assetId: string }

export async function checkDuplicates(
  connection: MobileConnection,
  filenames: string[],
  context: { libraryId?: string; folderId?: string | null } = {},
) {
  const unique = [...new Set(filenames)]
  const duplicates: DuplicateHit[] = []
  const chunkSize = 200

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const result = await fetchApi<{ duplicates: DuplicateHit[] }>(
      "/assets/check-duplicates",
      {
        connection,
        method: "POST",
        body: {
          filenames: chunk,
          ...(context.libraryId ? { libraryId: context.libraryId } : {}),
          ...(context.folderId !== undefined ? { folderId: context.folderId } : {}),
        },
      },
    )
    duplicates.push(...result.duplicates)
  }

  return { duplicates }
}
