import type { FilesFilterId } from "@/lib/files/library-helpers"
import type { AssetSummary, LibrarySummary } from "@/lib/types/assets"
import type { FolderSummary } from "@/lib/types/folders"

export type FilesCacheEntry = {
  libraries: LibrarySummary[]
  assets: AssetSummary[]
  folders?: FolderSummary[]
  fetchedAt: number
}

const memory = new Map<string, FilesCacheEntry>()

const STORAGE_PREFIX = "arciin-files:"
/** Revalidate in background after this age; still show cached data immediately. */
export const FILES_CACHE_MAX_AGE_MS = 5 * 60 * 1000

export function filesCacheKey(
  apiBaseUrl: string,
  filter: FilesFilterId,
  folderId?: string | null,
) {
  const base = apiBaseUrl.replace(/\/+$/, "")
  const folder = folderId ?? "root"
  return `${base}|${filter}|${folder}`
}

function storageKey(cacheKey: string) {
  return `${STORAGE_PREFIX}${cacheKey}`
}

export function readFilesCache(cacheKey: string): FilesCacheEntry | null {
  const mem = memory.get(cacheKey)
  if (mem) return mem

  if (typeof sessionStorage === "undefined") return null
  try {
    const raw = sessionStorage.getItem(storageKey(cacheKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as FilesCacheEntry
    if (!parsed.libraries || !parsed.assets) return null
    memory.set(cacheKey, parsed)
    return parsed
  } catch {
    return null
  }
}

export function writeFilesCache(cacheKey: string, entry: Omit<FilesCacheEntry, "fetchedAt">) {
  const full: FilesCacheEntry = { ...entry, fetchedAt: Date.now() }
  memory.set(cacheKey, full)
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(storageKey(cacheKey), JSON.stringify(full))
  } catch {
    /* quota — memory cache still works */
  }
}

export function patchFilesCacheAsset(
  cacheKey: string,
  updater: (assets: AssetSummary[]) => AssetSummary[],
) {
  const cached = readFilesCache(cacheKey)
  if (!cached) return
  writeFilesCache(cacheKey, {
    libraries: cached.libraries,
    assets: updater(cached.assets),
    folders: cached.folders,
  })
}

export function removeAssetFromAllCaches(apiBaseUrl: string, assetId: string) {
  const base = apiBaseUrl.replace(/\/+$/, "")
  const filters: FilesFilterId[] = [
    "all",
    "inbox",
    "videos",
    "images",
    "music",
    "documents",
  ]
  for (const filter of filters) {
    const key = filesCacheKey(base, filter)
    patchFilesCacheAsset(key, (assets) => assets.filter((a) => a.id !== assetId))
  }
}

export function isFilesCacheStale(entry: FilesCacheEntry) {
  return Date.now() - entry.fetchedAt > FILES_CACHE_MAX_AGE_MS
}
