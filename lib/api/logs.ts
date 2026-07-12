import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type { LogsOverview } from "@/lib/types/models"

export function getLogsOverview(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<LogsOverview>("/logs/overview", { connection, signal })
}
