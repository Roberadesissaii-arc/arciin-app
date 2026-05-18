import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type { UserPreferences } from "@/lib/types/models"

export function getUserPreferences(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<UserPreferences>("/auth/preferences", {
    connection,
    method: "GET",
    signal,
  })
}

export function updateUserPreferences(
  connection: MobileConnection,
  patch: Partial<{
    notifications: Partial<UserPreferences["notifications"]>
    appearance: Partial<UserPreferences["appearance"]>
    accessibility: Partial<UserPreferences["accessibility"]>
  }>,
) {
  return fetchApi<UserPreferences>("/auth/preferences", {
    connection,
    method: "PATCH",
    body: patch,
  })
}
