import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type { UploadSessionSummary } from "@/lib/types/assets"

export type ImportFromUrlOptions = {
  targetLibraryId?: string
  targetFolderId?: string
}

/** Queue a server-side import of a public link (YouTube, Instagram, PDF, …) — same endpoint as desktop. */
export function importFromUrl(
  connection: MobileConnection,
  url: string,
  options?: ImportFromUrlOptions,
  signal?: AbortSignal,
) {
  return fetchApi<UploadSessionSummary>("/imports", {
    method: "POST",
    connection,
    signal,
    body: {
      url,
      targetLibraryId: options?.targetLibraryId,
      targetFolderId: options?.targetFolderId,
    },
  })
}

/** Recent upload/import sessions — polled to track a link import's progress to completion. */
export function getUploadSessions(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<UploadSessionSummary[]>("/uploads", { connection, signal })
}

/** Upload session statuses that mean the worker is still fetching/processing. */
export const IMPORT_IN_PROGRESS_STATUSES = new Set([
  "QUEUED",
  "UPLOADING",
  "UPLOADED",
  "ANALYZING",
  "CLASSIFIED",
  "PROCESSING",
])
