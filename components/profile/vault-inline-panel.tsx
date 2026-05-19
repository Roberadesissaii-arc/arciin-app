"use client"

import Link from "next/link"
import { useCallback, useState } from "react"
import { FingerprintPattern, Loader2, Lock } from "lucide-react"

import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MobilePillSwitch, SettingsPanelLink } from "@/components/settings/mobile-toggle-row"
import {
  getPasswordVault,
  lockPasswordVault,
  updatePasswordVaultDisplay,
  type PasswordVaultDisplaySettings,
  type PasswordVaultList,
} from "@/lib/api/password-vault"
import { formatApiError } from "@/lib/api/errors"
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

  const { data: vault, loading, error, connection, setData, reload } =
    useStablePanelLoad<PasswordVaultList>(enabled, load)

  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const display = vault ? { ...DEFAULT_DISPLAY, ...vault.display } : DEFAULT_DISPLAY
  const lockRequired = vault?.lockRequired ?? true
  const secretsVisible = vault?.secretsVisible ?? false
  const pinConfigured = vault?.pinConfigured ?? false
  const entryCount = vault?.total ?? vault?.entries?.length ?? 0

  async function patchDisplay(patch: Partial<PasswordVaultDisplaySettings> & { accountPassword?: string }) {
    if (!connection) return
    setSaving(true)
    setActionError(null)
    setMessage(null)
    try {
      const next = await updatePasswordVaultDisplay(connection, patch)
      if (vault) {
        setData({
          ...vault,
          display: { ...DEFAULT_DISPLAY, ...next },
        })
      }
      setMessage("Vault settings saved.")
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleLock() {
    if (!connection) return
    setSaving(true)
    try {
      await lockPasswordVault(connection)
      reload()
      setMessage("Vault locked.")
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  function toggleRevealByDefault() {
    if (display.revealByDefault) {
      void patchDisplay({ revealByDefault: false })
      return
    }
    const password = window.prompt("Enter your Arciin account password to enable reveal by default:")
    if (!password?.trim()) return
    void patchDisplay({ revealByDefault: true, accountPassword: password.trim() })
  }

  if (!enabled) return null

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  if (error && !vault) {
    return <p className="text-[12px] text-[#b91c1c]">{error}</p>
  }

  return (
    <div className="flex flex-col gap-4">
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
          {lockRequired && !secretsVisible ? (
            <Lock className="size-5 text-[#717171]" />
          ) : (
            <FingerprintPattern className="size-5 text-[#ff4f12]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">
            {lockRequired && !secretsVisible ? "Vault locked" : "Vault unlocked"}
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
          Display
        </p>
        <div
          className="divide-y divide-[#f0f0f0] rounded-xl bg-[#f7f7f7] px-3"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <MobilePillSwitch
            label="Show username"
            on={display.showUsername}
            disabled={saving}
            onChange={() => void patchDisplay({ showUsername: !display.showUsername })}
          />
          <MobilePillSwitch
            label="Show URL"
            on={display.showUrl}
            disabled={saving}
            onChange={() => void patchDisplay({ showUrl: !display.showUrl })}
          />
          <MobilePillSwitch
            label="Show notes"
            on={display.showNotes}
            disabled={saving}
            onChange={() => void patchDisplay({ showNotes: !display.showNotes })}
          />
          <MobilePillSwitch
            label="Show category"
            on={display.showCategory}
            disabled={saving}
            onChange={() => void patchDisplay({ showCategory: !display.showCategory })}
          />
          <MobilePillSwitch
            label="Show password column"
            on={display.showPasswordColumn}
            disabled={saving}
            onChange={() => void patchDisplay({ showPasswordColumn: !display.showPasswordColumn })}
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
            onChange={() => void patchDisplay({ lockSidebarVault: !display.lockSidebarVault })}
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
                onClick={() => void patchDisplay({ maskStyle: style })}
                className="flex-1 rounded-lg py-2 text-[12px] font-semibold capitalize disabled:opacity-50"
                style={{
                  border: `1px solid ${display.maskStyle === style ? "#ff4f12" : "#e5e5e5"}`,
                  backgroundColor: display.maskStyle === style ? "rgba(255,79,18,0.08)" : "#f7f7f7",
                  color: display.maskStyle === style ? "#ff4f12" : "#717171",
                }}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {actionError ? (
        <p className="rounded-xl px-3 py-2 text-[12px] text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca]">
          {actionError}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl px-3 py-2 text-[12px] text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0]">
          {message}
        </p>
      ) : null}

      <SettingsPanelLink href="/profile/passwords" label="Browse saved passwords" />
    </div>
  )
}
