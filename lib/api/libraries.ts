import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type { LibrarySummary } from "@/lib/types/assets"

export function listLibraries(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<LibrarySummary[]>("/libraries", { connection, signal })
}
