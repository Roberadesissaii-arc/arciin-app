import type { MobileConnection } from "@/lib/types/api"
import { normalizeApiBase } from "@/lib/connection/normalize-url"
import type { MobileServerProfile } from "@/lib/connection/storage"

const LEGACY_KEY = "arciin_mobile_connection_v1"
const ACCOUNTS_KEY = "arciin_mobile_accounts_v2"

export type MobileAccountSession = {
  sessionToken: string
  sessionExpiresAt: string
  user: MobileConnection["user"]
  savedAt: string
}

export type MobileAccount = {
  id: string
  server: MobileServerProfile
  session?: MobileAccountSession
  lastUsedAt: string
}

type AccountsState = {
  accounts: MobileAccount[]
  activeAccountId: string | null
}

function isServerProfile(value: unknown): value is MobileServerProfile {
  if (!value || typeof value !== "object") return false
  const s = value as MobileServerProfile
  return Boolean(s.apiBaseUrl?.trim())
}

function accountIdForApiBase(apiBaseUrl: string): string {
  return normalizeApiBase(apiBaseUrl).toLowerCase()
}

function readLegacy(): AccountsState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as
      | { server: MobileServerProfile; session?: MobileAccountSession }
      | MobileConnection

    if (parsed && "server" in parsed && isServerProfile(parsed.server)) {
      const id = accountIdForApiBase(parsed.server.apiBaseUrl)
      return {
        accounts: [
          {
            id,
            server: parsed.server,
            session: parsed.session,
            lastUsedAt: parsed.session?.savedAt ?? new Date().toISOString(),
          },
        ],
        activeAccountId: id,
      }
    }

    if (parsed && "apiBaseUrl" in parsed && isServerProfile(parsed)) {
      const legacy = parsed as MobileConnection
      const server: MobileServerProfile = {
        apiBaseUrl: legacy.apiBaseUrl,
        socketUrl: legacy.socketUrl ?? legacy.apiBaseUrl,
        webUrl: legacy.webUrl ?? legacy.apiBaseUrl,
        instanceName: legacy.instanceName ?? "Arciin",
      }
      const id = accountIdForApiBase(server.apiBaseUrl)
      const session =
        legacy.sessionToken && legacy.sessionExpiresAt && legacy.user
          ? {
              sessionToken: legacy.sessionToken,
              sessionExpiresAt: legacy.sessionExpiresAt,
              user: legacy.user,
              savedAt: legacy.savedAt ?? new Date().toISOString(),
            }
          : undefined
      return {
        accounts: [{ id, server, session, lastUsedAt: session?.savedAt ?? new Date().toISOString() }],
        activeAccountId: id,
      }
    }
  } catch {
    return null
  }
  return null
}

function readAccountsState(): AccountsState {
  if (typeof window === "undefined") {
    return { accounts: [], activeAccountId: null }
  }
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AccountsState
      if (Array.isArray(parsed.accounts)) {
        return {
          accounts: parsed.accounts.filter((a) => isServerProfile(a.server)),
          activeAccountId: parsed.activeAccountId ?? null,
        }
      }
    }
  } catch {
    // fall through to migration
  }

  const migrated = readLegacy()
  if (migrated) {
    writeAccountsState(migrated)
    localStorage.removeItem(LEGACY_KEY)
    return migrated
  }

  return { accounts: [], activeAccountId: null }
}

function writeAccountsState(state: AccountsState) {
  if (typeof window === "undefined") return
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state))
}

export function listMobileAccounts(): MobileAccount[] {
  const { accounts } = readAccountsState()
  return [...accounts].sort(
    (a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt),
  )
}

export function getActiveAccountId(): string | null {
  return readAccountsState().activeAccountId
}

export function getActiveAccount(): MobileAccount | null {
  const state = readAccountsState()
  if (!state.activeAccountId) return state.accounts[0] ?? null
  return state.accounts.find((a) => a.id === state.activeAccountId) ?? state.accounts[0] ?? null
}

export function connectionFromAccount(account: MobileAccount): MobileConnection | null {
  if (!account.session) return null
  return {
    apiBaseUrl: account.server.apiBaseUrl,
    socketUrl: account.server.socketUrl,
    webUrl: account.server.webUrl,
    instanceName: account.server.instanceName,
    sessionToken: account.session.sessionToken,
    sessionExpiresAt: account.session.sessionExpiresAt,
    user: account.session.user,
    savedAt: account.session.savedAt,
  }
}

export function upsertAccountFromConnection(connection: MobileConnection): void {
  const state = readAccountsState()
  const id = accountIdForApiBase(connection.apiBaseUrl)
  const now = new Date().toISOString()
  const session: MobileAccountSession = {
    sessionToken: connection.sessionToken,
    sessionExpiresAt: connection.sessionExpiresAt,
    user: connection.user,
    savedAt: connection.savedAt,
  }
  const existing = state.accounts.find((a) => a.id === id)
  const server: MobileServerProfile = {
    ...(existing?.server ?? {}),
    apiBaseUrl: connection.apiBaseUrl,
    socketUrl: connection.socketUrl,
    webUrl: connection.webUrl,
    instanceName: connection.instanceName,
  }

  const accounts = existing
    ? state.accounts.map((a) =>
        a.id === id ? { ...a, server, session, lastUsedAt: now } : a,
      )
    : [...state.accounts, { id, server, session, lastUsedAt: now }]

  writeAccountsState({ accounts, activeAccountId: id })
}


export function updateActiveServerProfile(server: MobileServerProfile): void {
  const state = readAccountsState()
  const id = accountIdForApiBase(server.apiBaseUrl)
  const now = new Date().toISOString()

  const existing = state.accounts.find((a) => a.id === id)
  const accounts = existing
    ? state.accounts.map((a) => (a.id === id ? { ...a, server, lastUsedAt: now } : a))
    : [...state.accounts, { id, server, lastUsedAt: now }]

  writeAccountsState({ accounts, activeAccountId: id })
}

export function clearActiveAccountSession(): void {
  const state = readAccountsState()
  const activeId = state.activeAccountId
  if (!activeId) return
  writeAccountsState({
    accounts: state.accounts.map((a) =>
      a.id === activeId ? { ...a, session: undefined } : a,
    ),
    activeAccountId: activeId,
  })
}

export function removeAccount(accountId: string): void {
  const state = readAccountsState()
  const accounts = state.accounts.filter((a) => a.id !== accountId)
  const activeAccountId =
    state.activeAccountId === accountId ? (accounts[0]?.id ?? null) : state.activeAccountId
  writeAccountsState({ accounts, activeAccountId })
}

export function setActiveAccount(accountId: string): MobileAccount | null {
  const state = readAccountsState()
  const account = state.accounts.find((a) => a.id === accountId)
  if (!account) return null
  const now = new Date().toISOString()
  writeAccountsState({
    accounts: state.accounts.map((a) =>
      a.id === accountId ? { ...a, lastUsedAt: now } : a,
    ),
    activeAccountId: accountId,
  })
  return { ...account, lastUsedAt: now }
}

export function clearAllAccounts(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(ACCOUNTS_KEY)
  localStorage.removeItem(LEGACY_KEY)
}
