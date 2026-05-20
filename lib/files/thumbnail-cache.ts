import { assetThumbnailUrl } from "@/lib/api/assets"
import { arciinProxyHeaders, needsArciinSameOriginProxy } from "@/lib/api/arciin-proxy"
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

function thumbnailRequestInit(connection: MobileConnection): RequestInit {
  const useProxy = needsArciinSameOriginProxy(connection.apiBaseUrl)
  return {
    headers: {
      Accept: "image/*,*/*",
      Authorization: `Bearer ${connection.sessionToken}`,
      ...(useProxy ? arciinProxyHeaders(connection) : {}),
    },
    credentials: useProxy ? "same-origin" : "include",
    cache: "no-store",
  }
}

export function loadThumbnail(
  connection: MobileConnection,
  assetId: string,
): Promise<string | null> {
  const existing = blobByAssetId.get(assetId)
  if (existing) return Promise.resolve(existing)

  const pending = inflight.get(assetId)
  if (pending) return pending

  const promise = fetch(assetThumbnailUrl(connection, assetId), thumbnailRequestInit(connection))
    .then((res) => {
      if (!res.ok) throw new Error("thumbnail")
      return res.blob()
    })
    .then((blob) => {
      if (!blob.type.startsWith("image/") && blob.size === 0) {
        throw new Error("empty thumbnail")
      }
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
