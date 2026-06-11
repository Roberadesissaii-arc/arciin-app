"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { formatApiError } from "@/lib/api/errors"
import type { FolderCredentialInput } from "@/lib/api/folders"

export function MobileFolderCredentialSheet({
  pinConfigured,
  title,
  description,
  submitLabel = "Continue",
  onClose,
  onSubmit,
}: {
  pinConfigured: boolean
  title: string
  description: string
  submitLabel?: string
  onClose: () => void
  onSubmit: (input: FolderCredentialInput) => Promise<void>
}) {
  const [value, setValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!value.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSubmit(pinConfigured ? { pin: value } : { password: value })
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileBottomSheet open onClose={onClose} title={title} description={description}>
      {error ? <p className="mb-3 text-[12px] text-[#b91c1c]">{error}</p> : null}
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={pinConfigured ? "Vault PIN" : "Account password"}
        className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--arciin-accent,#ff4f12)]"
        autoComplete={pinConfigured ? "off" : "current-password"}
      />
      <button
        type="button"
        disabled={saving || !value.trim()}
        onClick={() => void submit()}
        className="btn-accent-solid mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitLabel}
      </button>
    </MobileBottomSheet>
  )
}
