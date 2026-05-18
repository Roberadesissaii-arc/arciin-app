import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type { HealthStatus } from "@/lib/types/database"

export function fetchHealth(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<HealthStatus>("/health", { connection, signal })
}
