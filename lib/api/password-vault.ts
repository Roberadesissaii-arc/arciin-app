import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import {
  buildSingleEntryImportText,
  type PasswordEntryDraft,
} from "@/lib/password-vault/import-text"

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

export type PasswordVaultImportResult = {
  imported: number
}

export function importPasswordVault(
  connection: MobileConnection,
  input: { text: string; fileName?: string; replace?: boolean },
) {
  return fetchApi<PasswordVaultImportResult>("/settings/password-vault/import", {
    connection,
    method: "POST",
    body: input,
  })
}

export function createPasswordVaultEntry(connection: MobileConnection, entry: PasswordEntryDraft) {
  return importPasswordVault(connection, {
    text: buildSingleEntryImportText(entry),
    fileName: "manual-entry.csv",
  })
}

export function updatePasswordVaultEntry(
  connection: MobileConnection,
  id: string,
  input: {
    name?: string
    username?: string
    password?: string
    url?: string
    notes?: string
    category?: string
  },
) {
  return fetchApi<PasswordVaultEntry>(`/settings/password-vault/${id}`, {
    connection,
    method: "PATCH",
    body: input,
  })
}

export function deletePasswordVaultEntry(connection: MobileConnection, id: string) {
  return fetchApi<{ success: boolean }>(`/settings/password-vault/${id}`, {
    connection,
    method: "DELETE",
  })
}

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

export function revealPasswordVaultEntry(
  connection: MobileConnection,
  id: string,
  input: VaultUnlockInput,
) {
  return fetchApi<PasswordVaultEntry>(`/settings/password-vault/${id}/reveal`, {
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
    method: "POST",
    body: input,
  })
}

export function setPasswordVaultPin(
  connection: MobileConnection,
  input: { pin: string; confirmPin: string; accountPassword: string },
) {
  return fetchApi<{ pinConfigured: boolean }>("/settings/password-vault/pin", {
    connection,
    method: "POST",
    body: input,
  })
}

export function removePasswordVaultPin(connection: MobileConnection, accountPassword: string) {
  return fetchApi<{ pinConfigured: boolean }>("/settings/password-vault/pin", {
    connection,
    method: "DELETE",
    body: { accountPassword },
  })
}
