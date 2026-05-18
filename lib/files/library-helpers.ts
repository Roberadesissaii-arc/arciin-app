import type { LibrarySummary } from "@/lib/types/assets"
import { librarySlugForFilter } from "@/lib/files/classify-file"

export type FilesFilterId = "all" | "inbox" | "videos" | "images" | "music" | "documents"

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

export function assetCountForFilter(libraries: LibrarySummary[], filter: FilesFilterId) {
  if (filter === "all") {
    return libraries.reduce((sum, l) => sum + l.assetCount, 0)
  }
  const lib = findLibraryBySlug(libraries, librarySlugForFilter(filter))
  return lib?.assetCount ?? 0
}
