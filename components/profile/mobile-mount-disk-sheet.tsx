"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { ApiError, formatApiError } from "@/lib/api/errors"
import type { UnmountedBlockDevice } from "@/lib/types/models"

function MountPasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-[#717171]">{label}</span>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] py-2.5 pl-3 pr-11 text-[14px] outline-none focus:border-[var(--arciin-accent,#ff4f12)]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#a0a0a0] active:bg-[#ececec] active:text-[#717171]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  )
}

export function MobileMountDiskSheet({
  device,
  needsSudoPassword,
  offerFormat: offerFormatInitial = false,
  mounting = false,
  onClose,
  onMount,
}: {
  device: UnmountedBlockDevice
  needsSudoPassword: boolean
  offerFormat?: boolean
  mounting?: boolean
  onClose: () => void
  onMount: (passwords: {
    luksPassphrase?: string
    sudoPassword?: string
    formatAsExt4?: boolean
    confirmErase?: boolean
  }) => Promise<void>
}) {
  const [luksPassphrase, setLuksPassphrase] = useState("")
  const [sudoPassword, setSudoPassword] = useState("")
  const [confirmErase, setConfirmErase] = useState(false)
  const [offerFormat, setOfferFormat] = useState(
    offerFormatInitial || Boolean(device.needsFormat),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOfferFormat(offerFormatInitial || Boolean(device.needsFormat))
    setConfirmErase(false)
    setError(null)
  }, [device.id, device.needsFormat, offerFormatInitial])

  const isLuks = Boolean(
    device.isLuks || (device.filesystem && /^crypto_LUKS/i.test(device.filesystem)),
  )
  const showLuks = isLuks
  const showSudo = needsSudoPassword || isLuks

  async function submit() {
    if (showLuks && !luksPassphrase) return
    if (offerFormat && !confirmErase) return

    setSaving(true)
    setError(null)
    try {
      await onMount({
        luksPassphrase: showLuks ? luksPassphrase : undefined,
        sudoPassword: showSudo ? sudoPassword : undefined,
        formatAsExt4: offerFormat && confirmErase,
        confirmErase: offerFormat && confirmErase,
      })
      onClose()
    } catch (err) {
      const msg = formatApiError(err)
      setError(msg)
      if (
        err instanceof ApiError &&
        (err.code === "NO_FILESYSTEM" ||
          err.code === "ERASE_NOT_CONFIRMED" ||
          err.code === "FORMAT_FAILED")
      ) {
        setOfferFormat(true)
      }
    } finally {
      setSaving(false)
    }
  }

  const formatting = offerFormat && confirmErase
  const busy = saving || mounting
  const canSubmit =
    (!showLuks || luksPassphrase.length > 0) && (!offerFormat || confirmErase)

  return (
    <MobileBottomSheet
      open
      onClose={busy ? () => {} : onClose}
      title={`Mount ${device.device}`}
      description={
        formatting
          ? "This will erase the drive and create a new ext4 filesystem, then mount it for Arciin."
          : showLuks
            ? "Enter the disk encryption password (LUKS). If your server user needs sudo, enter that password too."
            : offerFormat
              ? "No filesystem was found. Confirm erase below to format as ext4, or cancel and format on the server."
              : "Enter your server sudo password if required. Leave blank when the API user has passwordless sudo."
      }
    >
      {error ? <p className="mb-3 text-[12px] text-[#b91c1c]">{error}</p> : null}

      {offerFormat ? (
        <div
          className="mb-4 rounded-xl px-3 py-3"
          style={{
            border: "1px solid var(--arciin-accent-ring, rgba(255, 79, 18, 0.25))",
            backgroundColor: "var(--arciin-accent-wash, rgba(255, 79, 18, 0.06))",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-accent mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#222222]">Format required</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#717171]">
                This drive has no usable filesystem. Formatting as ext4 will{" "}
                <strong className="font-semibold text-[#222222]">erase all data</strong> on{" "}
                {device.device}.
              </p>
              <label className="mt-3 flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmErase}
                  onChange={(e) => setConfirmErase(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-[#d0d0d0]"
                />
                <span className="text-[12px] leading-snug text-[#222222]">
                  I understand this will erase {device.device} and format it as ext4
                </span>
              </label>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {showLuks ? (
          <MountPasswordField
            id="mount-luks-passphrase"
            label="Disk encryption password"
            value={luksPassphrase}
            onChange={setLuksPassphrase}
            placeholder="LUKS passphrase"
            autoComplete="off"
          />
        ) : null}

        {showSudo ? (
          <MountPasswordField
            id="mount-sudo-password"
            label="Server sudo password"
            value={sudoPassword}
            onChange={setSudoPassword}
            placeholder="sudo password"
            autoComplete="current-password"
          />
        ) : null}
      </div>

      <button
        type="button"
        disabled={busy || !canSubmit}
        onClick={() => void submit()}
        className="btn-accent-solid mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {formatting ? "Format & mount drive" : "Mount drive"}
      </button>
    </MobileBottomSheet>
  )
}
