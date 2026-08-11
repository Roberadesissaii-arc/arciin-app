import {
  assetDownloadFetchUrl,
  assetDownloadRequestInit,
} from "@/lib/api/asset-media-urls"
import type { MobileConnection } from "@/lib/types/api"

/**
 * Client-side cache for mobile video open.
 *
 * Full multi‑GB movies are still streamed (range requests). Smaller clips
 * (under MAX_BYTES) are stored after first open so the second open is instant.
 */

const CACHE_NAME = "arciin-video-stream-v1"
/** Max size of a single video we will fully cache on device. */
export const VIDEO_CACHE_MAX_BYTES = 64 * 1024 * 1024
/** Total budget across cached videos. */
const VIDEO_CACHE_TOTAL_BYTES = 220 * 1024 * 1024
const INDEX_LS_KEY = "arciin_video_stream_index_v1"

type IndexEntry = { assetId: string; size: number; at: number }

const memoryUrls = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

function readIndex(): IndexEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(INDEX_LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as IndexEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeIndex(entries: IndexEntry[]) {
  try {
    localStorage.setItem(INDEX_LS_KEY, JSON.stringify(entries))
  } catch {
    /* quota / private mode */
  }
}

function cacheRequest(assetId: string): Request {
  // Synthetic same-origin key — never hits the network.
  return new Request(`https://arciin.local/video-cache/${encodeURIComponent(assetId)}`)
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null
  try {
    return await caches.open(CACHE_NAME)
  } catch {
    return null
  }
}

function rememberUrl(assetId: string, blob: Blob): string {
  const existing = memoryUrls.get(assetId)
  if (existing) URL.revokeObjectURL(existing)
  const url = URL.createObjectURL(blob)
  memoryUrls.set(assetId, url)
  return url
}

/** Sync memory hit (same session after first load). */
export function getMemoryCachedVideoUrl(assetId: string): string | null {
  return memoryUrls.get(assetId) ?? null
}

/**
 * Resolve a playable object URL from memory or Cache API.
 * Returns null when not cached — caller should stream from the network.
 */
export async function getCachedVideoUrl(assetId: string): Promise<string | null> {
  const mem = memoryUrls.get(assetId)
  if (mem) return mem

  const cache = await openCache()
  if (!cache) return null

  try {
    const hit = await cache.match(cacheRequest(assetId))
    if (!hit) return null
    const blob = await hit.blob()
    if (!blob.size) return null
    return rememberUrl(assetId, blob)
  } catch {
    return null
  }
}

async function evictIfNeeded(nextSize: number): Promise<void> {
  const cache = await openCache()
  if (!cache) return

  const entries = readIndex().sort((a, b) => a.at - b.at)
  let total = entries.reduce((sum, e) => sum + e.size, 0)

  while (entries.length > 0 && total + nextSize > VIDEO_CACHE_TOTAL_BYTES) {
    const oldest = entries.shift()
    if (!oldest) break
    total -= oldest.size
    try {
      await cache.delete(cacheRequest(oldest.assetId))
    } catch {
      /* ignore */
    }
    const url = memoryUrls.get(oldest.assetId)
    if (url) {
      URL.revokeObjectURL(url)
      memoryUrls.delete(oldest.assetId)
    }
  }

  writeIndex(entries)
}

/**
 * Store a fully-downloaded video for instant reopen.
 * No-op when over size limit or Cache API unavailable.
 */
export async function putCachedVideo(
  assetId: string,
  blob: Blob,
  mimeType?: string | null,
): Promise<string | null> {
  if (blob.size <= 0 || blob.size > VIDEO_CACHE_MAX_BYTES) return null

  await evictIfNeeded(blob.size)

  const cache = await openCache()
  if (!cache) {
    // Memory-only fallback for this session.
    return rememberUrl(assetId, blob)
  }

  try {
    const headers = new Headers({
      "Content-Type": mimeType || blob.type || "video/mp4",
      "Content-Length": String(blob.size),
    })
    await cache.put(cacheRequest(assetId), new Response(blob, { headers }))
    const index = readIndex().filter((e) => e.assetId !== assetId)
    index.push({ assetId, size: blob.size, at: Date.now() })
    writeIndex(index)
    return rememberUrl(assetId, blob)
  } catch {
    return rememberUrl(assetId, blob)
  }
}

/**
 * Background-download a small video into the open-cache (after stream started
 * or after the viewer closes). Dedupes concurrent calls.
 */
export function warmVideoCache(
  connection: MobileConnection,
  assetId: string,
  sizeBytes: number,
  mimeType?: string | null,
): Promise<string | null> {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > VIDEO_CACHE_MAX_BYTES) {
    return Promise.resolve(null)
  }

  const existing = inflight.get(assetId)
  if (existing) return existing

  const promise = (async () => {
    const hit = await getCachedVideoUrl(assetId)
    if (hit) return hit

    const res = await fetch(
      assetDownloadFetchUrl(connection, assetId, true),
      assetDownloadRequestInit(connection),
    )
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) return null
    const blob = await res.blob()
    if (!blob.size || blob.size > VIDEO_CACHE_MAX_BYTES) return null
    return putCachedVideo(assetId, blob, mimeType || contentType)
  })()
    .catch(() => null)
    .finally(() => {
      inflight.delete(assetId)
    })

  inflight.set(assetId, promise)
  return promise
}

export function evictCachedVideo(assetId: string): void {
  const url = memoryUrls.get(assetId)
  if (url) URL.revokeObjectURL(url)
  memoryUrls.delete(assetId)
  writeIndex(readIndex().filter((e) => e.assetId !== assetId))
  void openCache().then((cache) => cache?.delete(cacheRequest(assetId)))
}
