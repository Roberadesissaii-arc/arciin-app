export type FolderSummary = {
  id: string
  libraryId: string
  parentFolderId?: string | null
  name: string
  slug: string
  pathCache: string
  assetCount: number
  isLocked?: boolean
  accessGranted?: boolean
  createdAt: string
  updatedAt: string
}
