import type { MobileAuthResult, MobileConnection } from "@/lib/types/api"

import {
  clearActiveAccountSession,
  clearAllAccounts,
  connectionFromAccount,
  getActiveAccount,
  listMobileAccounts,
  updateActiveServerProfile,
  upsertAccountFromConnection,
} from "@/lib/connection/accounts"

/** Saved server endpoints — kept across sign-out and session expiry. */
export type MobileServerProfile = {
  apiBaseUrl: string
  socketUrl: string
  webUrl: string
  instanceName: string
  /** Stable id from GET /mobile/discover — used to recognize the same instance after URL changes. */
  instanceId?: string
  /** Last known HTTPS tunnel or fixed domain from the server. */
  canonicalPublicUrl?: string
  /** LAN URLs to probe when the saved public URL stops working (same Wi‑Fi). */
  lanFallbackUrls?: string[]
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
  updateActiveServerProfile(server)
}

export function saveConnection(connection: MobileConnection) {
  upsertAccountFromConnection(connection)
}

export function loadServerProfile(): MobileServerProfile | null {
  return getActiveAccount()?.server ?? null
}

export function hasStoredServer(): boolean {
  return listMobileAccounts().length > 0
}

export function loadConnection(): MobileConnection | null {
  const account = getActiveAccount()
  if (!account) return null
  return connectionFromAccount(account)
}

/** Remove session only — server stays in your saved servers list. */
export function clearSession() {
  clearActiveAccountSession()
}

/** Remove all saved servers and sessions. */
export function clearConnection() {
  clearAllAccounts()
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

export { listMobileAccounts, removeAccount, setActiveAccount } from "@/lib/connection/accounts"
export type { MobileAccount } from "@/lib/connection/accounts"
