import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type { IntegrationSummary } from "@/lib/types/models"

export type PlexFolderStatus = {
  libraryId: string
  librarySlug: string
  libraryName: string
  folderId: string | null
  folderPath: string
  ready: boolean
}

export type ConnectorStatus = {
  enabled: boolean
  folders: PlexFolderStatus[]
  storageRoot: string
  mirrorRootHint: string
}

export type PlexStatus = ConnectorStatus
export type JellyfinStatus = ConnectorStatus

export function getPlexStatus(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<PlexStatus>("/integrations/plex/status", { connection, signal })
}

export function updatePlexIntegration(
  connection: MobileConnection,
  input: { enabled?: boolean },
) {
  return fetchApi<IntegrationSummary>("/integrations/plex", {
    connection,
    method: "PATCH",
    body: input,
  })
}

export function setupPlexFolders(connection: MobileConnection) {
  return fetchApi<{ created: number; folders: PlexFolderStatus[] }>(
    "/integrations/plex/setup-folders",
    { connection, method: "POST", body: {} },
  )
}

export function getJellyfinStatus(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<JellyfinStatus>("/integrations/jellyfin/status", { connection, signal })
}

export function updateJellyfinIntegration(
  connection: MobileConnection,
  input: { enabled?: boolean },
) {
  return fetchApi<IntegrationSummary>("/integrations/jellyfin", {
    connection,
    method: "PATCH",
    body: input,
  })
}

export function setupJellyfinFolders(connection: MobileConnection) {
  return fetchApi<{ created: number; folders: PlexFolderStatus[] }>(
    "/integrations/jellyfin/setup-folders",
    { connection, method: "POST", body: {} },
  )
}

export function isPlexIntegration(integration: IntegrationSummary) {
  return integration.type === "PLEX"
}

export function isJellyfinIntegration(integration: IntegrationSummary) {
  if (integration.type === "JELLYFIN") return true
  const config = integration.config as { connectorKind?: string } | null
  return config?.connectorKind === "jellyfin"
}
