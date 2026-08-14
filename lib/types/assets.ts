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
  /** Media codec (e.g. h264, vp9, av1) — used to warn when iOS can't decode it. */
  codec?: string | null
  /** Video/audio length in seconds — shown as a duration badge on thumbnails. */
  durationSeconds?: number | null
  /** Original link this asset was imported from — drives the source badge. */
  importSourceUrl?: string | null
  /** Device the upload came from ("web" | "mobile") — Computer/Phone badge fallback. */
  uploadClient?: string | null
  createdAt: string
  updatedAt: string
  /**
   * Set when an AI cover has been drawn for this file.
   *
   * A PDF renders its own first page on the device, so without this signal a
   * cover generated on the desktop sits on the server and is never asked for —
   * the phone kept showing page one.
   */
  coverImageAt?: string | null
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
