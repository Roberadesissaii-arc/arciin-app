import { fetchAssetBlob } from "@/lib/api/asset-binary"
import type { MobileConnection } from "@/lib/types/api"

const MAX_PREFETCH_BYTES = 120 * 1024 * 1024

type CacheEntry = {
  blob: Blob | null
  promise: Promise<Blob>
}

const cache = new Map<string, CacheEntry>()

function cacheKey(connection: MobileConnection, assetId: string): string {
  return `${connection.sessionToken}:${assetId}`
}

function rememberBlob(key: string, promise: Promise<Blob>): CacheEntry {
  const existing = cache.get(key)
  if (existing) return existing

  const entry: CacheEntry = {
    blob: null,
    promise: promise.then((blob) => {
      entry.blob = blob
      return blob
    }),
  }
  cache.set(key, entry)
  return entry
}

/**
 * Warm the blob cache while the viewer is open (helps iOS share after tap).
 * Skip huge files — and never use this for inline video/audio streams (callers
 * should not prefetch those; full download fights range streaming).
 */
export function prefetchAssetBlob(
  connection: MobileConnection,
  assetId: string,
  sizeBytes: number,
): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return
  if (sizeBytes > MAX_PREFETCH_BYTES) return
  const key = cacheKey(connection, assetId)
  if (cache.has(key)) return
  rememberBlob(key, fetchAssetBlob(connection, assetId, false))
}

export function getReadyAssetBlob(
  connection: MobileConnection,
  assetId: string,
): Blob | null {
  return cache.get(cacheKey(connection, assetId))?.blob ?? null
}

export function getAssetBlob(
  connection: MobileConnection,
  assetId: string,
): Promise<Blob> {
  const key = cacheKey(connection, assetId)
  return rememberBlob(key, fetchAssetBlob(connection, assetId, false)).promise
}

export function clearAssetBlobCache(assetId?: string): void {
  if (!assetId) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.endsWith(`:${assetId}`)) cache.delete(key)
  }
}
