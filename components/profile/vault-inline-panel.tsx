"use client"

import { useCallback, useState } from "react"
import { FingerprintPattern, Loader2 } from "lucide-react"

import { VaultAccountPasswordSheet } from "@/components/profile/vault-account-password-sheet"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { MobilePillSwitch, SettingsPanelLink } from "@/components/settings/mobile-toggle-row"
import {
  getPasswordVault,
  lockPasswordVault,
  removePasswordVaultPin,
  setPasswordVaultPin,
  updatePasswordVaultDisplay,
  type PasswordVaultDisplaySettings,
  type PasswordVaultList,
} from "@/lib/api/password-vault"
import { formatApiError } from "@/lib/api/errors"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"

const DEFAULT_DISPLAY: PasswordVaultDisplaySettings = {
  showUsername: true,
  showUrl: true,
  showNotes: true,
  showCategory: true,
  showPasswordColumn: true,
  maskStyle: "dots",
  revealByDefault: false,
  lockSidebarVault: true,
}

export function VaultInlinePanel({ enabled }: { enabled: boolean }) {
  const load = useCallback(
    (connection: Parameters<typeof getPasswordVault>[0], signal: AbortSignal) =>
      getPasswordVault(connection, signal),
    [],
  )

  const {
    data: vault,
    loading,
    error,
    showingCachedOffline,
    isRevalidating,
    connection,
    setData,
    reload,
  } = useStablePanelLoad<PasswordVaultList>(enabled, load, { cacheKey: "vault" })

  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage(enabled)
  const [passwordSheetOpen, setPasswordSheetOpen] = useState(false)
  const [pinSheetOpen, setPinSheetOpen] = useState(false)
  const [removePinSheetOpen, setRemovePinSheetOpen] = useState(false)
  const [pinValue, setPinValue] = useState("")
  const [pinConfirm, setPinConfirm] = useState("")

  const display = vault ? { ...DEFAULT_DISPLAY, ...vault.display } : DEFAULT_DISPLAY
  const lockRequired = vault?.lockRequired ?? true
  const secretsVisible = vault?.secretsVisible ?? false
  const pinConfigured = vault?.pinConfigured ?? false
  const entryCount = vault?.total ?? vault?.entries?.length ?? 0

  async function patchDisplay(
    patch: Partial<PasswordVaultDisplaySettings> & { accountPassword?: string },
    optimistic?: Partial<PasswordVaultDisplaySettings>,
  ) {
    if (!connection) return
    const previous = vault

    if (vault && optimistic) {
      setData({
        ...vault,
        display: { ...display, ...optimistic },
      })
    }

    setSaving(true)
    setActionError(null)
    clearStatus()
    try {
      const next = await updatePasswordVaultDisplay(connection, patch)
      if (vault) {
        setData({
          ...vault,
          display: { ...DEFAULT_DISPLAY, ...next },
        })
      }
      showStatus("Vault settings saved.")
    } catch (err) {
      if (previous) setData(previous)
      setActionError(
        formatApiError(err, connection.webUrl ?? connection.apiBaseUrl),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleLock() {
    if (!connection) return
    setSaving(true)
    setActionError(null)
    try {
      await lockPasswordVault(connection)
      reload()
      showStatus("Vault locked.")
    } catch (err) {
      setActionError(formatApiError(err, connection.webUrl ?? connection.apiBaseUrl))
    } finally {
      setSaving(false)
    }
  }

  function toggleRevealByDefault() {
    if (display.revealByDefault) {
      void patchDisplay({ revealByDefault: false }, { revealByDefault: false })
      return
    }
    setPasswordSheetOpen(true)
  }

  async function confirmRevealByDefault(password: string) {
    if (!connection) throw new Error("Not connected to a server.")
    setSaving(true)
    setActionError(null)
    try {
      const next = await updatePasswordVaultDisplay(connection, {
        revealByDefault: true,
        accountPassword: password,
      })
      if (vault) {
        setData({
          ...vault,
          display: { ...DEFAULT_DISPLAY, ...next },
        })
      }
      showStatus("Vault settings saved.")
    } catch (err) {
      const msg = formatApiError(err, connection.webUrl ?? connection.apiBaseUrl)
      setActionError(msg)
      throw new Error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function confirmSetPin(password: string) {
    if (!connection) throw new Error("Not connected to a server.")
    if (!pinValue.trim() || pinValue !== pinConfirm) {
      throw new Error("PINs must match.")
    }
    setSaving(true)
    setActionError(null)
    try {
      await setPasswordVaultPin(connection, {
        pin: pinValue,
        confirmPin: pinConfirm,
        accountPassword: password,
      })
      setPinValue("")
      setPinConfirm("")
      setPinSheetOpen(false)
      reload()
      showStatus("Vault PIN saved.")
    } catch (err) {
      const msg = formatApiError(err, connection.webUrl ?? connection.apiBaseUrl)
      setActionError(msg)
      throw new Error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemovePin(password: string) {
    if (!connection) return
    setSaving(true)
    setActionError(null)
    try {
      await removePasswordVaultPin(connection, password)
      reload()
      showStatus("Vault PIN removed.")
    } catch (err) {
      setActionError(formatApiError(err, connection.webUrl ?? connection.apiBaseUrl))
    } finally {
      setSaving(false)
    }
  }

  if (!enabled) return null

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  if (!vault) {
    return <MutedPanelError error={error} onRetry={() => void reload()} />
  }

  return (
    <div className="flex flex-col gap-4">
      {showingCachedOffline ? (
        <OfflineCachedNotice revalidating={isRevalidating} />
      ) : null}
      <SettingsIntroCard
        icon={FingerprintPattern}
        title="Password vault"
        description="Control how saved credentials appear and whether the vault requires unlock before viewing secrets."
      />

      <div className="flex items-center gap-3 rounded-xl bg-[#f7f7f7] p-3" style={{ border: "1px solid #e5e5e5" }}>
        <div
          className="flex size-10 items-center justify-center rounded-xl bg-white"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <FingerprintPattern className="text-accent size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">
            {loading
              ? "Loading…"
              : lockRequired && !secretsVisible
                ? "Vault locked"
                : "Vault unlocked"}
          </p>
          <p className="text-[12px] text-[#717171]">
            {entryCount.toLocaleString()} entries
            {pinConfigured ? " · PIN on" : ""}
          </p>
        </div>
        {lockRequired && secretsVisible ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleLock()}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#717171]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            Lock
          </button>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Vault PIN
        </p>
        <div
          className="rounded-xl bg-[#f7f7f7] px-3 py-3"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <p className="text-[12px] text-[#717171]">
            {pinConfigured
              ? "PIN unlock is enabled for this vault."
              : "Optional PIN for faster unlock on this device."}
          </p>
          {!pinConfigured ? (
            <div className="mt-3 space-y-2">
              <input
                type="password"
                inputMode="numeric"
                placeholder="New PIN"
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value)}
                className="w-full rounded-lg bg-white px-3 py-2.5 text-[14px] outline-none"
                style={{ border: "1px solid #e5e5e5" }}
              />
              <input
                type="password"
                inputMode="numeric"
                placeholder="Confirm PIN"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value)}
                className="w-full rounded-lg bg-white px-3 py-2.5 text-[14px] outline-none"
                style={{ border: "1px solid #e5e5e5" }}
              />
              <button
                type="button"
                disabled={saving || !pinValue || pinValue !== pinConfirm}
                onClick={() => setPinSheetOpen(true)}
                className="btn-accent-solid h-10 w-full rounded-lg text-[12px] font-semibold disabled:opacity-50"
              >
                Save PIN
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => setRemovePinSheetOpen(true)}
              className="mt-3 h-10 w-full rounded-lg border border-[#e5e5e5] bg-white text-[12px] font-semibold text-[#717171] disabled:opacity-50"
            >
              Remove PIN (account password required)
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Display
        </p>
        <div
          className="divide-y divide-[#f0f0f0] rounded-xl bg-[#f7f7f7] px-3 py-2"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <MobilePillSwitch
            label="Show username"
            on={display.showUsername}
            disabled={saving}
            onChange={() =>
              void patchDisplay(
                { showUsername: !display.showUsername },
                { showUsername: !display.showUsername },
              )
            }
          />
          <MobilePillSwitch
            label="Show URL"
            on={display.showUrl}
            disabled={saving}
            onChange={() =>
              void patchDisplay({ showUrl: !display.showUrl }, { showUrl: !display.showUrl })
            }
          />
          <MobilePillSwitch
            label="Show notes"
            on={display.showNotes}
            disabled={saving}
            onChange={() =>
              void patchDisplay(
                { showNotes: !display.showNotes },
                { showNotes: !display.showNotes },
              )
            }
          />
          <MobilePillSwitch
            label="Show category"
            on={display.showCategory}
            disabled={saving}
            onChange={() =>
              void patchDisplay(
                { showCategory: !display.showCategory },
                { showCategory: !display.showCategory },
              )
            }
          />
          <MobilePillSwitch
            label="Show password column"
            on={display.showPasswordColumn}
            disabled={saving}
            onChange={() =>
              void patchDisplay(
                { showPasswordColumn: !display.showPasswordColumn },
                { showPasswordColumn: !display.showPasswordColumn },
              )
            }
          />
          <MobilePillSwitch
            label="Reveal by default"
            hint="Account password required to enable"
            on={display.revealByDefault}
            disabled={saving}
            onChange={toggleRevealByDefault}
          />
          <MobilePillSwitch
            label="Require unlock"
            on={display.lockSidebarVault}
            disabled={saving}
            onChange={() =>
              void patchDisplay(
                { lockSidebarVault: !display.lockSidebarVault },
                { lockSidebarVault: !display.lockSidebarVault },
              )
            }
          />
        </div>
      </div>

      {display.showPasswordColumn ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[12px] font-semibold text-[#717171]">Mask style</p>
          <div className="flex gap-2">
            {(["dots", "asterisk", "block"] as const).map((style) => (
              <button
                key={style}
                type="button"
                disabled={saving}
                onClick={() => void patchDisplay({ maskStyle: style }, { maskStyle: style })}
                className="flex-1 rounded-lg py-2 text-[12px] font-semibold capitalize disabled:opacity-50"
                style={{
                  border: `1px solid ${display.maskStyle === style ? "var(--arciin-accent)" : "#e5e5e5"}`,
                  backgroundColor:
                    display.maskStyle === style ? "var(--arciin-accent-muted)" : "#f7f7f7",
                  color: display.maskStyle === style ? "var(--arciin-accent)" : "#717171",
                }}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {actionError ? <MutedPanelError error={actionError} /> : null}
      <PanelStatusBanner message={message} />

      <SettingsPanelLink href="/profile/passwords" label="Browse saved passwords" />

      <VaultAccountPasswordSheet
        open={passwordSheetOpen}
        onClose={() => setPasswordSheetOpen(false)}
        onConfirm={confirmRevealByDefault}
      />
      <VaultAccountPasswordSheet
        open={pinSheetOpen}
        onClose={() => setPinSheetOpen(false)}
        onConfirm={confirmSetPin}
      />
      <VaultAccountPasswordSheet
        open={removePinSheetOpen}
        onClose={() => setRemovePinSheetOpen(false)}
        onConfirm={async (password) => {
          await handleRemovePin(password)
        }}
      />
    </div>
  )
}
