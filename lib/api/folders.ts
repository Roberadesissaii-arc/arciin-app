import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type { FolderSummary } from "@/lib/types/folders"

export function listFolders(
  connection: MobileConnection,
  libraryId: string,
  signal?: AbortSignal,
) {
  return fetchApi<FolderSummary[]>(`/libraries/${libraryId}/folders`, {
    connection,
    method: "GET",
    signal,
  })
}

export function createFolder(
  connection: MobileConnection,
  libraryId: string,
  body: { name: string; parentFolderId?: string | null },
) {
  return fetchApi<FolderSummary>(`/libraries/${libraryId}/folders`, {
    connection,
    method: "POST",
    body: {
      name: body.name,
      ...(body.parentFolderId ? { parentFolderId: body.parentFolderId } : {}),
    },
  })
}

export function deleteFolder(connection: MobileConnection, folderId: string) {
  return fetchApi<{ success: boolean }>(`/folders/${folderId}/delete`, {
    connection,
    method: "POST",
    body: {},
  })
}

export function renameFolder(connection: MobileConnection, folderId: string, name: string) {
  return fetchApi<FolderSummary>(`/folders/${folderId}`, {
    connection,
    method: "PATCH",
    body: { name },
  })
}
