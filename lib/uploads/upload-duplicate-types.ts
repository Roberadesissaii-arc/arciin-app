export type UploadTarget = {
  libraryId?: string
  folderId: string | null
}

export type DuplicateUploadResolution = "replace" | "keep-both" | "skip"

export type DuplicateUploadConflict = {
  file: File
  existingAssetId: string
  target: UploadTarget
  resolution: DuplicateUploadResolution | null
}
