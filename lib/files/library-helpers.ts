import type { AssetSummary, LibrarySummary } from "@/lib/types/assets"
import type { FolderSummary } from "@/lib/types/folders"
import { librarySlugForFilter } from "@/lib/files/classify-file"

export type FilesFilterId = "all" | "inbox" | "videos" | "images" | "music" | "documents"

const SCOPED_FILTERS = ["inbox", "videos", "images", "music", "documents"] as const

export { librarySlugForFilter } from "@/lib/files/classify-file"

export function findLibraryBySlug(libraries: LibrarySummary[], slug: string) {
  return libraries.find(
    (l) => l.slug === slug || l.name.toLowerCase() === slug.toLowerCase(),
  )
}

export function libraryIdForFilter(libraries: LibrarySummary[], filter: FilesFilterId) {
  if (filter === "all") return undefined
  const slug = librarySlugForFilter(filter)
  return findLibraryBySlug(libraries, slug)?.id
}

/** Root-level assets + every folder's assets (matches library total when API is in sync). */
export function computeLibraryAssetTotal(
  library: LibrarySummary | undefined,
  folders: FolderSummary[],
  rootAssets: AssetSummary[],
): number {
  if (!library) return 0
  const folderSum = folders
    .filter((f) => f.libraryId === library.id)
    .reduce((sum, f) => sum + f.assetCount, 0)
  const rootCount = rootAssets.filter(
    (a) => a.libraryId === library.id && !a.folderId,
  ).length
  return Math.max(library.assetCount, folderSum + rootCount)
}

export function assetCountForFilter(
  libraries: LibrarySummary[],
  filter: FilesFilterId,
  context?: {
    activeFilter?: FilesFilterId
    folders?: FolderSummary[]
    rootAssets?: AssetSummary[]
    atLibraryRoot?: boolean
  },
) {
  if (filter === "all") {
    return libraries.reduce((sum, l) => sum + l.assetCount, 0)
  }
  const lib = findLibraryBySlug(libraries, librarySlugForFilter(filter))
  if (
    context?.atLibraryRoot &&
    context.activeFilter === filter &&
    context.folders &&
    context.rootAssets
  ) {
    return computeLibraryAssetTotal(lib, context.folders, context.rootAssets)
  }
  return lib?.assetCount ?? 0
}

export function assetCountsByFilter(
  libraries: LibrarySummary[],
  context?: {
    activeFilter?: FilesFilterId
    folders?: FolderSummary[]
    rootAssets?: AssetSummary[]
    atLibraryRoot?: boolean
  },
): Record<FilesFilterId, number> {
  const counts = {
    all: assetCountForFilter(libraries, "all"),
    inbox: 0,
    videos: 0,
    images: 0,
    music: 0,
    documents: 0,
  }
  for (const id of SCOPED_FILTERS) {
    counts[id] = assetCountForFilter(libraries, id, context)
  }
  return counts
}

export function formatAssetCount(count: number) {
  return `${count} asset${count === 1 ? "" : "s"}`
}
