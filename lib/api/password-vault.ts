import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"

export type PasswordVaultDisplaySettings = {
  showUsername: boolean
  showUrl: boolean
  showNotes: boolean
  showCategory: boolean
  showPasswordColumn: boolean
  maskStyle: "dots" | "asterisk" | "block"
  revealByDefault: boolean
  lockSidebarVault: boolean
}

export type PasswordVaultEntry = {
  id: string
  name: string
  username: string | null
  password: string | null
  passwordLength?: number | null
  hasPassword?: boolean
  url: string | null
  notes: string | null
  category: string | null
}

export type PasswordVaultList = {
  entries: PasswordVaultEntry[]
  total: number
  display: PasswordVaultDisplaySettings
  lockRequired: boolean
  secretsVisible: boolean
  pinConfigured: boolean
}

export type VaultUnlockInput = { password?: string; pin?: string }

export function getPasswordVault(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<PasswordVaultList>("/settings/password-vault", { connection, signal })
}

export function unlockPasswordVault(connection: MobileConnection, input: VaultUnlockInput) {
  return fetchApi<{ unlocked: boolean; expiresInMinutes: number }>(
    "/settings/password-vault/unlock",
    { connection, method: "POST", body: input },
  )
}

export function verifyPasswordVault(connection: MobileConnection, input: VaultUnlockInput) {
  return fetchApi<{ verified: boolean }>("/settings/password-vault/verify", {
    connection,
    method: "POST",
    body: input,
  })
}

export function lockPasswordVault(connection: MobileConnection) {
  return fetchApi<{ locked: boolean }>("/settings/password-vault/lock", {
    connection,
    method: "POST",
    body: {},
  })
}

export function updatePasswordVaultDisplay(
  connection: MobileConnection,
  input: Partial<PasswordVaultDisplaySettings> & { accountPassword?: string },
) {
  return fetchApi<PasswordVaultDisplaySettings>("/settings/password-vault/display", {
    connection,
    method: "PATCH",
    body: input,
  })
}
