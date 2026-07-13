import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type {
  AppDatabaseFolderSummary,
  AppDatabaseRecordSummary,
  AppDatabaseSummary,
} from "@/lib/types/database"

export function listAppDatabases(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<AppDatabaseSummary[]>("/app-databases", { connection, signal })
}

export function createAppDatabase(
  connection: MobileConnection,
  body: { name: string; description?: string },
  signal?: AbortSignal,
) {
  return fetchApi<AppDatabaseSummary>("/app-databases", {
    connection,
    method: "POST",
    body,
    signal,
  })
}

export function deleteAppDatabase(
  connection: MobileConnection,
  databaseId: string,
  signal?: AbortSignal,
) {
  return fetchApi<{ success: true }>(`/app-databases/${databaseId}`, {
    connection,
    method: "DELETE",
    signal,
  })
}

export function getAppDatabase(
  connection: MobileConnection,
  databaseId: string,
  signal?: AbortSignal,
) {
  return fetchApi<AppDatabaseSummary>(`/app-databases/${databaseId}`, {
    connection,
    signal,
  })
}

export function listAppDatabaseFolders(
  connection: MobileConnection,
  databaseId: string,
  signal?: AbortSignal,
) {
  return fetchApi<AppDatabaseFolderSummary[]>(`/app-databases/${databaseId}/tables`, {
    connection,
    signal,
  })
}

export function createAppDatabaseFolder(
  connection: MobileConnection,
  databaseId: string,
  body: { name: string; parentFolderId?: string },
  signal?: AbortSignal,
) {
  return fetchApi<AppDatabaseFolderSummary>(`/app-databases/${databaseId}/tables`, {
    connection,
    method: "POST",
    body,
    signal,
  })
}

export function listFolderRecords(
  connection: MobileConnection,
  folderId: string,
  signal?: AbortSignal,
) {
  return fetchApi<AppDatabaseRecordSummary[]>(`/app-database-tables/${folderId}/rows`, {
    connection,
    signal,
  })
}

export function createFolderRecord(
  connection: MobileConnection,
  folderId: string,
  body: { name: string; payload: Record<string, unknown> },
  signal?: AbortSignal,
) {
  return fetchApi<AppDatabaseRecordSummary>(`/app-database-tables/${folderId}/rows`, {
    connection,
    method: "POST",
    body,
    signal,
  })
}

export function deleteFolderRecord(
  connection: MobileConnection,
  recordId: string,
  signal?: AbortSignal,
) {
  return fetchApi<{ success: true }>(`/app-database-rows/${recordId}`, {
    connection,
    method: "DELETE",
    signal,
  })
}
