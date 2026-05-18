import { assetThumbnailUrl } from "@/lib/api/assets"
import type { MobileConnection } from "@/lib/types/api"

const blobByAssetId = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

export function getCachedThumbnailUrl(assetId: string) {
  return blobByAssetId.get(assetId) ?? null
}

export function evictThumbnail(assetId: string) {
  const url = blobByAssetId.get(assetId)
  if (url) URL.revokeObjectURL(url)
  blobByAssetId.delete(assetId)
  inflight.delete(assetId)
}

export function loadThumbnail(
  connection: MobileConnection,
  assetId: string,
): Promise<string | null> {
  const existing = blobByAssetId.get(assetId)
  if (existing) return Promise.resolve(existing)

  const pending = inflight.get(assetId)
  if (pending) return pending

  const promise = fetch(assetThumbnailUrl(connection, assetId), {
    headers: { Authorization: `Bearer ${connection.sessionToken}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("thumbnail")
      return res.blob()
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob)
      blobByAssetId.set(assetId, url)
      return url
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(assetId)
    })

  inflight.set(assetId, promise)
  return promise
}
