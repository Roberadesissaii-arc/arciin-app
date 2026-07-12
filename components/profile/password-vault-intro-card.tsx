"use client"

import { FingerprintPattern, Lock } from "lucide-react"

import {
  MobilePageIntro,
  MobilePageIntroStatusPill,
} from "@/components/shell/mobile-page-intro"

export function PasswordVaultIntroCard({
  entryCount,
  loading,
  lockRequired,
  secretsVisible,
  pinConfigured,
  onUnlock,
  onLock,
}: {
  entryCount: number
  loading?: boolean
  loadingLabel?: string
  lockRequired: boolean
  secretsVisible: boolean
  pinConfigured: boolean
  onLock: () => void
  onUnlock: () => void
}) {
  const description = pinConfigured
    ? "Saved credentials stay encrypted on disk. Unlock with your 6-digit PIN to view or copy secrets."
    : lockRequired && !secretsVisible
      ? "Unlock the vault once to browse every entry with the eye icon, or tap the eye on a single row."
      : entryCount === 0
        ? "No credentials stored yet. Tap + to add a password or import from a file."
        : "Vault is unlocked — tap the eye on each row to show or hide that password."

  return (
    <MobilePageIntro
      title="Passwords"
      subtitle="Encrypted vault · instance credentials on your server."
      description={description}
      cornerIcon={FingerprintPattern}
      footer={
        <>
          {entryCount > 0 || loading ? (
            <MobilePageIntroStatusPill icon={Lock}>
              {loading ? "…" : `${entryCount} saved`}
            </MobilePageIntroStatusPill>
          ) : (
            <MobilePageIntroStatusPill icon={Lock}>Vault ready</MobilePageIntroStatusPill>
          )}
          {lockRequired ? (
            secretsVisible ? (
              <button
                type="button"
                onClick={onLock}
                className="rounded-full border border-[#e5e5e5] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#717171] active:bg-[#f7f7f7]"
              >
                Lock vault
              </button>
            ) : (
              <button
                type="button"
                onClick={onUnlock}
                className="btn-accent-solid rounded-full px-3.5 py-1.5 text-[12px] font-semibold active:opacity-90"
              >
                Unlock vault
              </button>
            )
          ) : null}
        </>
      }
    />
  )
}
