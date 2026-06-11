export type InstanceStatus = {
  initialized: boolean
  setupRequired: boolean
  instanceName?: string
  version: string
  /** Dev-only — from GET /instance/status when API NODE_ENV !== production. */
  setupTokenPrefill?: string
  suggestedStorageRoot?: string
  runtimeStorageRoot?: string
  hostStorageRoot?: string | null
  isDockerRuntime?: boolean
  storageRootHint?: string | null
}

export type ClaimInstanceInput = {
  setupToken: string
  instanceName: string
  adminName: string
  adminEmail: string
  adminPassword: string
  storageRoot: string
  libraries: string[]
  acceptedTermsAndPrivacy: boolean
  recoveryQuestion?: string
  recoveryAnswer?: string
}

export type StorageVolumeOption = {
  id: string
  label: string
  arciinPath: string
  recommended?: boolean
  writable?: boolean
  availableBytes?: number | null
  totalBytes?: number | null
}

export type StorageDiscovery = {
  recommendedArciinPath: string
  volumes: StorageVolumeOption[]
  installNotes: string[]
}

export type StoragePrepareResult = {
  arciinPath: string
  writable: boolean
}
