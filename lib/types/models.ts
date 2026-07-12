import type { JobSummary } from "@/lib/api/jobs"

export type ActivitySummary = {
  id: string
  type: string
  title: string
  message?: string | null
  entityType?: string | null
  createdAt: string
}

export type UploadSessionSummary = {
  id: string
  status: string
  progress: number
  originalFilename: string
  createdAt: string
}

export type UploadSettings = {
  maxUploadSizeMb: number
  maxUploadSizeBytes: number
  uploadRateLimitPerMinute: number
  envMaxUploadSizeMb: number
  webProxyMaxUploadSizeMb: number
  webProxyRestartRequired: boolean
}

export type StorageSettings = {
  instanceName?: string
  storageRoot?: string
  runtimeStorageRoot?: string
  hostStorageRoot?: string | null
  isDockerRuntime?: boolean
  defaultLocationId?: string | null
  usageBytes: number
  objectCount: number
  totalBytes?: number | null
  availableBytes?: number | null
  writable: boolean
}

export type StorageVolumeOption = {
  id: string
  label: string
  arciinPath: string
  mountPoint: string | null
  filesystem?: string | null
  device?: string | null
  totalBytes: number | null
  availableBytes: number | null
  writable: boolean
  recommended: boolean
  largeExternal: boolean
  isCurrent?: boolean
  sameDiskAsCurrent?: boolean
}

export type UnmountedBlockDevice = {
  id: string
  device: string
  name: string
  sizeLabel: string
  sizeBytes: number | null
  filesystem: string | null
  isLuks: boolean
  needsFormat?: boolean
  type: "disk" | "part"
  suggestedMountPoint: string
  suggestedArciinPath: string
  model?: string | null
  transport?: string | null
}

export type CurrentStorageDeviceContext = {
  mountDevice: string | null
  mountPoint: string | null
  filesystemTotalBytes: number | null
  filesystemAvailableBytes: number | null
  blockDevice: string | null
  blockDeviceSizeBytes: number | null
  blockDeviceModel: string | null
  blockDeviceTransport: string | null
}

export type StorageBlockDisk = {
  id: string
  device: string
  name: string
  sizeLabel: string
  sizeBytes: number | null
  model: string | null
  transport: string | null
  role: "system" | "attached" | "internal"
  unmountedPartitionCount: number
}

export type MountBlockDeviceResult = {
  device: string
  mountPoint: string
  arciinPath: string
  mapperName?: string
}

export type StorageVolumesResponse = {
  volumes: StorageVolumeOption[]
  currentStorageRoot: string
  installNotes?: string[]
  isDockerRuntime?: boolean
  unmountedDevices: UnmountedBlockDevice[]
  blockDisks?: StorageBlockDisk[]
  currentDeviceContext?: CurrentStorageDeviceContext | null
  mountPasswordlessSudo?: boolean
  migrationTargets?: StorageVolumeOption[]
}

export type StorageMigrateStatus = {
  active: boolean
  job: {
    id: string
    status: string
    progress: number
    error: string | null
    result: unknown
    createdAt: string
    completedAt: string | null
  } | null
}

export type StorageMigrateStartResult = {
  jobId: string
  fromRoot: string
  toRoot: string
  displayRoot: string
}

export type RemoteAccessSettings = {
  mobilePublicUrl?: string | null
  requestOrigin?: string | null
  publicUrl?: string | null
  localUrl?: string | null
  loopbackUrl?: string | null
  lanUrls?: string[]
  primaryLanUrl?: string | null
  currentUrl?: string | null
  mode: "local" | "reverse-proxy" | "cloudflare-tunnel"
  reverseProxyEnabled: boolean
  cloudflareTunnelEnabled: boolean
  cloudflareTunnelAutoStart?: boolean
}

export type SecuritySettings = {
  publicSignupEnabled: boolean
  sessionTimeoutMinutes: number
  loginAlertsEnabled: boolean
  maxFailedLogins: number
  idleLogoutEnabled: boolean
  idleLogoutMinutes: number
  ipAllowlist: string[]
  ipBlocklist: string[]
  enforceIpAllowlist: boolean
  apiGlobalRequestsPerMinute: number
  apiKeyRequestsPerMinute: number
  requireApiKeyExpiry: boolean
  maxApiKeyExpiryDays: number
}

export type AccessControlStatus = {
  instanceInitialized: boolean
  setupLocked: boolean
  userCount: number
  activeSessions: number
  ownerCount: number
  publicSignupEnabled: boolean
  sessionTimeoutMinutes: number
  loginAlertsEnabled: boolean
  maxFailedLogins: number
  passwordHashing: string
  sessionStorage: string
  cookieFlags: string
}

export type ApiProtectionStatus = {
  activeApiKeys: number
  requestsThisMinute: number | null
  globalLimitPerMinute: number
  globalLimitEnabled: boolean
  perKeyLimitPerMinute: number
  perKeyLimitEnabled: boolean
  allowlistCount: number
  blocklistCount: number
  enforceIpAllowlist: boolean
  requireApiKeyExpiry: boolean
  maxApiKeyExpiryDays: number
}

export type ClearInstanceDataInput = {
  password: string
  clearChat: boolean
  clearMedia: boolean
  clearAppData?: boolean
}

export type AiEmojiUsage = "none" | "low" | "medium" | "high"

export type AiSettings = {
  agent: boolean
  autonomy: boolean
  planning: boolean
  showThinking: boolean
  emojiUsage: AiEmojiUsage
}

export type PasswordVaultAiShare = {
  names: boolean
  usernames: boolean
  urls: boolean
  notes: boolean
}

export type AiSecuritySettings = {
  blockInjection: boolean
  redactSecrets: boolean
  redactPII: boolean
  readOnlyTools: boolean
  libraryToolAccess: "full" | "sandbox" | "vision_only"
  requireToolApproval: boolean
  hideLibraryNames: boolean
  hideAssetCounts: boolean
  hideStorageSize: boolean
  hideUploadDates: boolean
  passwordVaultAiAccess: "blocked" | "count_only" | "metadata"
  passwordVaultAiShare: PasswordVaultAiShare
  passwordQueriesLocalAiOnly: boolean
}

export type AuthSession = {
  user: import("@/lib/types/api").UserSummary
  session: { id: string; expiresAt: string } | null
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export type UpdateProfileInput = {
  name?: string
  email?: string
}

export type SessionDetail = {
  id: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

export type NotificationPreferences = {
  uploadSound: boolean
  uploadCompleteToast: boolean
  uploadFailedToast: boolean
  activityFeedToast: boolean
  securityEventsToast: boolean
}

export type AppearancePreferences = {
  compactView: boolean
  animatedCards: boolean
  accentColor: string
  toastPosition: string
  toastStyle: string
  toastShowIcons: boolean
  uiRadius: string
}

export type AccessibilityPreferences = {
  fontSize: string
  reduceAnimations: boolean
  highContrast: boolean
  keyboardNav: boolean
}

export type MediaPreferences = {
  documentThumbnails: boolean
}

export type UserPreferences = {
  notifications: NotificationPreferences
  appearance: AppearancePreferences
  accessibility: AccessibilityPreferences
  media: MediaPreferences
}

export type ApiKeySummary = {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt?: string | null
  expiresAt?: string | null
  createdAt: string
  revokedAt?: string | null
}

export type CreateApiKeyInput = {
  name: string
  scopes: string[]
  expiresAt?: string
}

export type CreateApiKeyResult = {
  apiKey: ApiKeySummary
  rawKey: string
}

export type IntegrationSummary = {
  id: string
  type: string
  name: string
  enabled: boolean
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type LogsOverview = {
  jobs: {
    queued: number
    active: number
    completed: number
    failed: number
  }
}

export type ModelProfile = {
  id: string
  provider: string
  displayName: string
  apiKeyMasked: string | null
  hasApiKey: boolean
  baseUrl: string | null
  defaultModel: string | null
  ttsModel: string | null
  isDefault: boolean
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type CreateModelProfileInput = {
  provider: string
  displayName: string
  apiKey?: string | null
  baseUrl?: string | null
  defaultModel?: string | null
  ttsModel?: string | null
  isDefault?: boolean
  isEnabled?: boolean
}

export type UpdateModelProfileInput = Partial<CreateModelProfileInput>

export type OllamaCloudModelProbe = {
  name: string
  access: "available" | "paid" | "rate_limited" | "error"
  message?: string
}

export type OllamaAvailableModelsResult = {
  models: string[]
  fromCache: boolean
}

export type OllamaModelCapabilityEntry = {
  model: string
  capabilities: string[]
  vision: boolean
  thinking: boolean
}

export type OllamaModelCapabilitiesResult = {
  entries: OllamaModelCapabilityEntry[]
  fromCache: boolean
}

export type OllamaCloudModelsResult = {
  probes: OllamaCloudModelProbe[]
  fromCache: boolean
}

export type HomeOverview = {
  /** Total jobs in the instance (matches the Jobs screen list). */
  jobCount: number
  /** Queued + currently running jobs. */
  runningJobs: number
  uploadCount: number
  uploadInProgress: number
  passwordVaultCount: number | null
  passwordVaultLocked: boolean | null
  /** null when app databases are locked on this plan (403) or unavailable. */
  appDataCount: number | null
  recentEventsCount: number
  storage: StorageSettings | null
  recentActivity: ActivitySummary[]
  recentJobs: JobSummary[]
}
