export type MediaType =
  | "VIDEO"
  | "IMAGE"
  | "AUDIO"
  | "DOCUMENT"
  | "ARCHIVE"
  | "APPLICATION"
  | "CODE"
  | "OTHER"

export type AssetSummary = {
  id: string
  libraryId: string
  folderId?: string | null
  originalFilename: string
  title?: string | null
  mimeType: string
  mediaType: MediaType
  sizeBytes: number
  status: string
  createdAt: string
  updatedAt: string
}

export type LibrarySummary = {
  id: string
  name: string
  slug: string
  assetCount: number
}

export type UploadSessionSummary = {
  id: string
  status: string
  progress: number
  originalFilename: string
  mimeType?: string | null
  detectedMediaType?: string | null
  assetId?: string | null
  targetLibraryId?: string | null
  targetLibrary?: LibrarySummary | null
  createdAt: string
}
