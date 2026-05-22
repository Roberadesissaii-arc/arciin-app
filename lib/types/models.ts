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
  totalBytes: number | null
  availableBytes: number | null
  writable: boolean
  recommended: boolean
  largeExternal: boolean
  isCurrent?: boolean
}

export type StorageVolumesResponse = {
  volumes: StorageVolumeOption[]
  currentStorageRoot: string
  installNotes?: string[]
  isDockerRuntime?: boolean
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
  recentEventsCount: number
  storage: StorageSettings | null
  recentActivity: ActivitySummary[]
  recentJobs: JobSummary[]
}
