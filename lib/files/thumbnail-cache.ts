import { assetThumbnailUrl } from "@/lib/api/assets"
import { arciinProxyHeaders, needsArciinSameOriginProxy } from "@/lib/api/arciin-proxy"
import type { MobileConnection } from "@/lib/types/api"

const blobByAssetId = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

const DB_NAME = "arciin_mobile_media_thumbnails"
const STORE = "thumbs"
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGetBlob(assetId: string): Promise<Blob | undefined> {
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly")
      const req = tx.objectStore(STORE).get(assetId)
      req.onsuccess = () => resolve(req.result as Blob | undefined)
      req.onerror = () => resolve(undefined)
    })
  } catch {
    return undefined
  }
}

async function idbSetBlob(assetId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(blob, assetId)
  } catch {
    /* optional */
  }
}

function rememberBlobUrl(assetId: string, blob: Blob) {
  const existing = blobByAssetId.get(assetId)
  if (existing) URL.revokeObjectURL(existing)
  const url = URL.createObjectURL(blob)
  blobByAssetId.set(assetId, url)
  return url
}

export function getCachedThumbnailUrl(assetId: string) {
  return blobByAssetId.get(assetId) ?? null
}

/** Restore server-generated thumbnails from IndexedDB after app restart. */
export async function hydrateThumbnailFromCache(assetId: string): Promise<string | null> {
  const mem = blobByAssetId.get(assetId)
  if (mem) return mem

  const blob = await idbGetBlob(assetId)
  if (!blob || blob.size === 0) return null
  return rememberBlobUrl(assetId, blob)
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

  const promise = (async () => {
    const cached = await hydrateThumbnailFromCache(assetId)
    if (cached) return cached

    const res = await fetch(assetThumbnailUrl(connection, assetId), thumbnailRequestInit(connection))
    if (!res.ok) throw new Error("thumbnail")
    const blob = await res.blob()
    if (!blob.type.startsWith("image/") && blob.size === 0) {
      throw new Error("empty thumbnail")
    }
    await idbSetBlob(assetId, blob)
    return rememberBlobUrl(assetId, blob)
  })()
    .catch(() => null)
    .finally(() => {
      inflight.delete(assetId)
    })

  inflight.set(assetId, promise)
  return promise
}
