export type FolderSummary = {
  id: string
  libraryId: string
  parentFolderId?: string | null
  name: string
  slug: string
  pathCache: string
  assetCount: number
  createdAt: string
  updatedAt: string
}
