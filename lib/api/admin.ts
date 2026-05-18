import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type { AdminTable, AdminTableData } from "@/lib/types/database"

export function fetchAdminTables(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<AdminTable[]>("/admin/tables", { connection, signal })
}

export function fetchAdminTableData(
  connection: MobileConnection,
  table: string,
  page = 1,
  signal?: AbortSignal,
) {
  return fetchApi<AdminTableData>(`/admin/tables/${table}?page=${page}&limit=20`, {
    connection,
    signal,
  })
}
