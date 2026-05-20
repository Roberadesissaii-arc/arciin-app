import {
  assetDownloadFetchUrl,
  assetDownloadRequestInit,
} from "@/lib/api/assets"
import type { MobileConnection } from "@/lib/types/api"

const memCache = new Map<string, string>()
const MAX_MEM_CACHE = 160

function memSet(key: string, value: string) {
  if (memCache.size >= MAX_MEM_CACHE) {
    const first = memCache.keys().next().value
    if (first) memCache.delete(first)
  }
  memCache.set(key, value)
}

const DB_NAME = "arciin_mobile_pdf_thumbnails"
const STORE = "pdf_thumbs"
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

async function idbGet(key: string): Promise<string | undefined> {
  try {
    const db = await openDb()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly")
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result as string | undefined)
      req.onerror = () => resolve(undefined)
    })
  } catch {
    return undefined
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(value, key)
  } catch {
    /* optional cache */
  }
}

const renderQueue: (() => Promise<void>)[] = []
let activeRenders = 0
const MAX_CONCURRENT = 2

function drainQueue() {
  while (activeRenders < MAX_CONCURRENT && renderQueue.length > 0) {
    const job = renderQueue.shift()!
    activeRenders++
    job().finally(() => {
      activeRenders--
      drainQueue()
    })
  }
}

function enqueueRender(fn: () => Promise<void>) {
  renderQueue.push(fn)
  drainQueue()
}

let pdfjsInit: Promise<typeof import("pdfjs-dist")> | null = null

export function loadPdfJs() {
  if (!pdfjsInit) {
    pdfjsInit = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString()
      return pdfjsLib
    })
  }
  return pdfjsInit
}

export function pdfThumbnailCacheKey(assetId: string, updatedAt: string) {
  return `${assetId}:${updatedAt}`
}

/** Stable key so cache survives updatedAt string/format differences across sessions. */
export function pdfThumbnailStableKey(assetId: string) {
  return `asset:${assetId}`
}

export function getCachedPdfThumbnail(assetId: string, updatedAt: string) {
  return memCache.get(pdfThumbnailCacheKey(assetId, updatedAt)) ?? null
}

/** Read memory + IndexedDB without downloading the PDF. */
export async function readPdfThumbnailCache(
  assetId: string,
  updatedAt: string,
): Promise<string | null> {
  const versionedKey = pdfThumbnailCacheKey(assetId, updatedAt)
  const memHit = memCache.get(versionedKey)
  if (memHit) return memHit

  const versionedIdb = await idbGet(versionedKey)
  if (versionedIdb) {
    memSet(versionedKey, versionedIdb)
    return versionedIdb
  }

  const stableKey = pdfThumbnailStableKey(assetId)
  const stableIdb = await idbGet(stableKey)
  if (stableIdb) {
    memSet(versionedKey, stableIdb)
    return stableIdb
  }

  return null
}

async function persistPdfThumbnail(
  assetId: string,
  updatedAt: string,
  dataUrl: string,
) {
  const versionedKey = pdfThumbnailCacheKey(assetId, updatedAt)
  memSet(versionedKey, dataUrl)
  await idbSet(versionedKey, dataUrl)
  await idbSet(pdfThumbnailStableKey(assetId), dataUrl)
}

export function isPdfAsset(asset: {
  mimeType?: string | null
  originalFilename?: string
}): boolean {
  const mime = (asset.mimeType ?? "").toLowerCase()
  if (mime === "application/pdf") return true
  const name = (asset.originalFilename ?? "").toLowerCase()
  return name.endsWith(".pdf")
}

export async function fetchPdfDocument(
  connection: MobileConnection,
  assetId: string,
) {
  const res = await fetch(
    assetDownloadFetchUrl(connection, assetId, true),
    assetDownloadRequestInit(connection),
  )
  if (!res.ok) throw new Error("pdf_fetch_failed")
  const data = await res.arrayBuffer()
  const pdfjsLib = await loadPdfJs()
  return pdfjsLib.getDocument({
    data,
    disableAutoFetch: true,
    disableStream: true,
  }).promise
}

async function renderPdfThumbDataUrl(
  connection: MobileConnection,
  assetId: string,
): Promise<string | null> {
  const pdf = await fetchPdfDocument(connection, assetId)

  try {
    const page = await pdf.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const targetCssWidth = 320
    const pixelRatio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2.5)
    const renderScale = (targetCssWidth / base.width) * pixelRatio
    const scaledViewport = page.getViewport({ scale: renderScale })

    const canvas = document.createElement("canvas")
    canvas.width = Math.floor(scaledViewport.width)
    canvas.height = Math.floor(scaledViewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    await page.render({ canvasContext: ctx, viewport: scaledViewport, canvas }).promise
    const dataUrl = canvas.toDataURL("image/webp", 0.88)
    page.cleanup()
    return dataUrl
  } finally {
    await pdf.destroy()
  }
}

export function loadPdfThumbnail(
  connection: MobileConnection,
  assetId: string,
  updatedAt: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    void readPdfThumbnailCache(assetId, updatedAt).then((cached) => {
      if (cached) {
        resolve(cached)
        return
      }

      enqueueRender(() =>
        (async () => {
          try {
            const dataUrl = await renderPdfThumbDataUrl(connection, assetId)
            if (dataUrl) {
              await persistPdfThumbnail(assetId, updatedAt, dataUrl)
              resolve(dataUrl)
              return
            }
            resolve(null)
          } catch {
            resolve(null)
          }
        })(),
      )
    })
  })
}
