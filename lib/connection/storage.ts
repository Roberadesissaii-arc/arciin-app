import type { MobileAuthResult, MobileConnection } from "@/lib/types/api"

const STORAGE_KEY = "arciin_mobile_connection_v1"

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

export function loadConnection(): MobileConnection | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MobileConnection
    if (!parsed?.sessionToken || !parsed?.apiBaseUrl) return null
    return parsed
  } catch {
    return null
  }
}

export function saveConnection(connection: MobileConnection) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connection))
}

export function clearConnection() {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
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
