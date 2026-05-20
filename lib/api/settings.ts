import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type {
  ApiKeySummary,
  CreateApiKeyInput,
  CreateApiKeyResult,
  IntegrationSummary,
  RemoteAccessSettings,
  StorageSettings,
  StorageVolumesResponse,
} from "@/lib/types/models"

export function getStorageSettings(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<StorageSettings>("/settings/storage", {
    connection,
    method: "GET",
    signal,
  })
}

export function updateStorageSettings(connection: MobileConnection, storageRoot: string) {
  return fetchApi<StorageSettings>("/settings/storage", {
    connection,
    method: "PATCH",
    body: { storageRoot },
  })
}

export function getStorageVolumes(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<StorageVolumesResponse>("/settings/storage/volumes", {
    connection,
    method: "GET",
    signal,
  })
}

export function getRemoteAccessSettings(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<RemoteAccessSettings>("/settings/remote-access", {
    connection,
    method: "GET",
    signal,
  })
}

export function updateRemoteAccessSettings(
  connection: MobileConnection,
  input: Partial<RemoteAccessSettings>,
) {
  return fetchApi<RemoteAccessSettings>("/settings/remote-access", {
    connection,
    method: "PATCH",
    body: input,
  })
}

export type CloudflareTunnelStatus = {
  running: boolean
  url: string | null
  localTarget: string | null
  error: string | null
  cloudflareTunnelEnabled: boolean
  publicUrl?: string | null
  mobilePublicUrl?: string | null
}

export function getCloudflareTunnelStatus(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<CloudflareTunnelStatus>("/settings/cloudflare-tunnel", {
    connection,
    signal,
  })
}

export function getApiKeys(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<ApiKeySummary[]>("/api-keys", {
    connection,
    method: "GET",
    signal,
  })
}

export function createApiKey(connection: MobileConnection, input: CreateApiKeyInput) {
  return fetchApi<CreateApiKeyResult>("/api-keys", {
    connection,
    method: "POST",
    body: input,
  })
}

export function revokeApiKey(connection: MobileConnection, id: string) {
  return fetchApi<{ success: true }>(`/api-keys/${id}`, {
    connection,
    method: "DELETE",
  })
}

export function listIntegrations(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<IntegrationSummary[]>("/integrations", {
    connection,
    method: "GET",
    signal,
  })
}
