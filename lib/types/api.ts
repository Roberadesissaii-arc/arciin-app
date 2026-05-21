export type ApiErrorBody = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type UserSummary = {
  id: string
  name: string
  email: string
  role: string
  status: string
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export type ServerEndpoints = {
  webUrl: string
  apiBaseUrl: string
  socketUrl: string
  instanceName: string
  version: string
  requestOrigin: string | null
  instanceId?: string | null
  canonicalPublicUrl?: string | null
  canonicalApiBaseUrl?: string | null
  canonicalSocketUrl?: string | null
  lanUrls?: string[]
}

export type MobileDiscoverResult = {
  service: string
  initialized: boolean
  instanceName: string
  version: string
  webUrl: string
  apiBaseUrl: string
  socketUrl: string
  requestOrigin: string | null
  instanceId?: string | null
  canonicalPublicUrl?: string | null
  canonicalApiBaseUrl?: string | null
  canonicalSocketUrl?: string | null
  lanUrls?: string[]
  pairingSupported: boolean
}

export type MobileAuthResult = {
  sessionToken: string
  sessionExpiresAt: string
  user: UserSummary
  server: ServerEndpoints
}

export type MobileConnection = {
  sessionToken: string
  sessionExpiresAt: string
  apiBaseUrl: string
  socketUrl: string
  webUrl: string
  instanceName: string
  user: UserSummary
  savedAt: string
}
