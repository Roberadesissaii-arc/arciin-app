import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type {
  AccessControlStatus,
  AiSecuritySettings,
  AiSettings,
  ApiKeySummary,
  ApiProtectionStatus,
  ClearInstanceDataInput,
  CreateApiKeyInput,
  CreateApiKeyResult,
  IntegrationSummary,
  RemoteAccessSettings,
  SecuritySettings,
  MountBlockDeviceResult,
  StorageMigrateStartResult,
  StorageMigrateStatus,
  StorageSettings,
  StorageVolumesResponse,
  UploadSettings,
} from "@/lib/types/models"

export function getUploadSettings(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<UploadSettings>("/settings/uploads", {
    connection,
    method: "GET",
    signal,
  })
}

export function updateUploadSettings(
  connection: MobileConnection,
  input: Partial<Pick<UploadSettings, "maxUploadSizeMb" | "uploadRateLimitPerMinute">>,
) {
  return fetchApi<UploadSettings>("/settings/uploads", {
    connection,
    method: "PATCH",
    body: input,
  })
}

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

export function mountStorageDevice(
  connection: MobileConnection,
  input: {
    deviceId: string
    luksPassphrase?: string
    sudoPassword?: string
    formatAsExt4?: boolean
    confirmErase?: boolean
  },
) {
  return fetchApi<MountBlockDeviceResult>("/settings/storage/mount", {
    connection,
    method: "POST",
    body: input,
  })
}

export function getStorageMigrateStatus(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<StorageMigrateStatus>("/settings/storage/migrate/status", {
    connection,
    method: "GET",
    signal,
  })
}

export function startStorageMigration(connection: MobileConnection, targetPath: string) {
  return fetchApi<StorageMigrateStartResult>("/settings/storage/migrate", {
    connection,
    method: "POST",
    body: { targetPath },
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

export function startCloudflareTunnel(connection: MobileConnection) {
  return fetchApi<CloudflareTunnelStatus>("/settings/cloudflare-tunnel/start", {
    connection,
    method: "POST",
    body: {},
  })
}

export function stopCloudflareTunnel(connection: MobileConnection) {
  return fetchApi<CloudflareTunnelStatus>("/settings/cloudflare-tunnel/stop", {
    connection,
    method: "POST",
    body: {},
  })
}

export function getSecuritySettings(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<SecuritySettings>("/settings/security", {
    connection,
    method: "GET",
    signal,
  })
}

export function updateSecuritySettings(
  connection: MobileConnection,
  input: Partial<SecuritySettings>,
) {
  return fetchApi<SecuritySettings>("/settings/security", {
    connection,
    method: "PATCH",
    body: input,
  })
}

export function getAccessControlStatus(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<AccessControlStatus>("/settings/access-control/status", {
    connection,
    method: "GET",
    signal,
  })
}

export function revokeAllSessionsExceptCurrent(connection: MobileConnection) {
  return fetchApi<{ revoked: number }>("/settings/access-control/revoke-all-sessions", {
    connection,
    method: "POST",
    body: {},
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

export function getApiProtectionStatus(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<ApiProtectionStatus>("/settings/api-protection/status", {
    connection,
    method: "GET",
    signal,
  })
}

export function patchApiProtectionIpRule(
  connection: MobileConnection,
  body: { action: "block" | "allow" | "unblock" | "disallow"; ip: string },
) {
  return fetchApi<{ ipBlocklist: string[]; ipAllowlist: string[] }>(
    "/settings/api-protection/ip-rules",
    {
      connection,
      method: "POST",
      body,
    },
  )
}

export function rotateApiKey(connection: MobileConnection, id: string) {
  return fetchApi<CreateApiKeyResult>(`/api-keys/${id}/rotate`, {
    connection,
    method: "POST",
    body: {},
  })
}

export function clearInstanceData(connection: MobileConnection, input: ClearInstanceDataInput) {
  return fetchApi<{ ok: true }>("/settings/clear-data", {
    connection,
    method: "POST",
    body: {
      password: input.password,
      clearChat: input.clearChat,
      clearMedia: input.clearMedia,
      clearAppData: input.clearAppData ?? false,
    },
  })
}

export function getAiSettings(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<AiSettings>("/settings/ai", {
    connection,
    method: "GET",
    signal,
  })
}

export function updateAiSettings(
  connection: MobileConnection,
  input: Partial<AiSettings>,
) {
  return fetchApi<AiSettings>("/settings/ai", {
    connection,
    method: "PATCH",
    body: input,
  })
}

export function getAiSecuritySettings(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<AiSecuritySettings>("/settings/ai-security", {
    connection,
    method: "GET",
    signal,
  })
}

export function updateAiSecuritySettings(
  connection: MobileConnection,
  input: Partial<AiSecuritySettings>,
) {
  return fetchApi<AiSecuritySettings>("/settings/ai-security", {
    connection,
    method: "PATCH",
    body: input,
  })
}
