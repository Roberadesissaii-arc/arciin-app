export type HealthStatus = {
  api: "online" | "offline"
  database: "online" | "offline"
  redis: "online" | "offline"
  realtime: "online" | "offline"
  worker: "online" | "offline" | "unknown"
  storage: "online" | "offline"
  version: string
  timestamp: string
}

export type AdminTable = {
  name: string
  label: string
  description: string
  count: number
}

export type AdminTableData = {
  rows: Record<string, unknown>[]
  total: number
  page: number
  totalPages: number
  limit: number
}

export type AppDatabaseSummary = {
  id: string
  name: string
  slug: string
  description?: string | null
  createdById: string
  folderCount: number
  createdAt: string
  updatedAt: string
}

export type AppDatabaseFolderSummary = {
  id: string
  databaseId: string
  parentFolderId?: string | null
  name: string
  slug: string
  pathCache: string
  recordCount: number
  childFolderCount: number
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type AppDatabaseRecordSummary = {
  id: string
  folderId: string
  name: string
  payload: Record<string, unknown>
  mimeType?: string | null
  createdAt: string
  updatedAt: string
}
