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
