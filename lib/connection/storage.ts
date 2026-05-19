import type { MobileAuthResult, MobileConnection } from "@/lib/types/api"

const STORAGE_KEY = "arciin_mobile_connection_v1"

/** Saved server endpoints — kept across sign-out and session expiry. */
export type MobileServerProfile = {
  apiBaseUrl: string
  socketUrl: string
  webUrl: string
  instanceName: string
}

type StoredMobileState = {
  server: MobileServerProfile
  session?: {
    sessionToken: string
    sessionExpiresAt: string
    user: MobileConnection["user"]
    savedAt: string
  }
}

function isServerProfile(value: unknown): value is MobileServerProfile {
  if (!value || typeof value !== "object") return false
  const s = value as MobileServerProfile
  return Boolean(s.apiBaseUrl?.trim())
}

function migrateLegacyConnection(raw: MobileConnection): StoredMobileState | null {
  if (!raw?.apiBaseUrl?.trim()) return null
  const server: MobileServerProfile = {
    apiBaseUrl: raw.apiBaseUrl,
    socketUrl: raw.socketUrl ?? raw.apiBaseUrl,
    webUrl: raw.webUrl ?? raw.apiBaseUrl,
    instanceName: raw.instanceName ?? "Arciin",
  }
  if (raw.sessionToken && raw.sessionExpiresAt && raw.user) {
    return {
      server,
      session: {
        sessionToken: raw.sessionToken,
        sessionExpiresAt: raw.sessionExpiresAt,
        user: raw.user,
        savedAt: raw.savedAt ?? new Date().toISOString(),
      },
    }
  }
  return { server }
}

function readState(): StoredMobileState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredMobileState | MobileConnection
    if (parsed && "server" in parsed && isServerProfile(parsed.server)) {
      return parsed as StoredMobileState
    }
    return migrateLegacyConnection(parsed as MobileConnection)
  } catch {
    return null
  }
}

function writeState(state: StoredMobileState | null) {
  if (typeof window === "undefined") return
  if (!state) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function connectionFromAuth(auth: MobileAuthResult): MobileConnection {
  return {
    sessionToken: auth.sessionToken,
    sessionExpiresAt: auth.sessionExpiresAt,
    apiBaseUrl: auth.server.apiBaseUrl,
    socketUrl: auth.server.socketUrl,
    webUrl: auth.server.webUrl,
    instanceName: auth.server.instanceName,
    user: auth.user,
    savedAt: new Date().toISOString(),
  }
}

export function saveServerProfile(server: MobileServerProfile) {
  const prev = readState()
  writeState({ server, session: prev?.session })
}

export function saveConnection(connection: MobileConnection) {
  writeState({
    server: {
      apiBaseUrl: connection.apiBaseUrl,
      socketUrl: connection.socketUrl,
      webUrl: connection.webUrl,
      instanceName: connection.instanceName,
    },
    session: {
      sessionToken: connection.sessionToken,
      sessionExpiresAt: connection.sessionExpiresAt,
      user: connection.user,
      savedAt: connection.savedAt,
    },
  })
}

export function loadServerProfile(): MobileServerProfile | null {
  return readState()?.server ?? null
}

export function hasStoredServer(): boolean {
  return Boolean(loadServerProfile()?.apiBaseUrl)
}

export function loadConnection(): MobileConnection | null {
  const state = readState()
  if (!state?.session || !state.server) return null
  const { server, session } = state
  return {
    apiBaseUrl: server.apiBaseUrl,
    socketUrl: server.socketUrl,
    webUrl: server.webUrl,
    instanceName: server.instanceName,
    sessionToken: session.sessionToken,
    sessionExpiresAt: session.sessionExpiresAt,
    user: session.user,
    savedAt: session.savedAt,
  }
}

/** Remove session only — server address stays for the next sign-in. */
export function clearSession() {
  const state = readState()
  if (!state) return
  writeState({ server: state.server })
}

/** Remove server and session (new device / change server). */
export function clearConnection() {
  writeState(null)
}

export function isConnectionExpired(connection: MobileConnection): boolean {
  const expires = Date.parse(connection.sessionExpiresAt)
  if (Number.isNaN(expires)) return true
  return expires <= Date.now()
}

export function hasStoredConnection(): boolean {
  const c = loadConnection()
  return Boolean(c && !isConnectionExpired(c))
}
