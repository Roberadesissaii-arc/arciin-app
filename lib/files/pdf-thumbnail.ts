import {
  assetDownloadFetchUrl,
  assetDownloadRequestInit,
} from "@/lib/api/assets"
import type { MobileConnection } from "@/lib/types/api"

const memCache = new Map<string, string>()
const MAX_MEM_CACHE = 120

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

function loadPdfJs() {
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

export function getCachedPdfThumbnail(assetId: string, updatedAt: string) {
  return memCache.get(pdfThumbnailCacheKey(assetId, updatedAt)) ?? null
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

async function renderPdfThumbDataUrl(
  connection: MobileConnection,
  assetId: string,
): Promise<string | null> {
  const res = await fetch(
    assetDownloadFetchUrl(connection, assetId, true),
    assetDownloadRequestInit(connection),
  )
  if (!res.ok) return null

  const data = await res.arrayBuffer()
  const pdfjsLib = await loadPdfJs()
  const pdf = await pdfjsLib.getDocument({
    data,
    disableAutoFetch: true,
    disableStream: true,
  }).promise

  try {
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const targetWidth = 320
    const scale = targetWidth / viewport.width
    const scaledViewport = page.getViewport({ scale })

    const canvas = document.createElement("canvas")
    canvas.width = Math.floor(scaledViewport.width)
    canvas.height = Math.floor(scaledViewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    await page.render({ canvasContext: ctx, viewport: scaledViewport, canvas }).promise
    const dataUrl = canvas.toDataURL("image/webp", 0.78)
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
  const cacheKey = pdfThumbnailCacheKey(assetId, updatedAt)
  const memHit = memCache.get(cacheKey)
  if (memHit) return Promise.resolve(memHit)

  return new Promise((resolve) => {
    enqueueRender(() =>
      (async () => {
        try {
          const cached = await idbGet(cacheKey)
          if (cached) {
            memSet(cacheKey, cached)
            resolve(cached)
            return
          }

          const dataUrl = await renderPdfThumbDataUrl(connection, assetId)
          if (dataUrl) {
            memSet(cacheKey, dataUrl)
            await idbSet(cacheKey, dataUrl)
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
}
