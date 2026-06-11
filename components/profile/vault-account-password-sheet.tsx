"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, Lock } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"

export function VaultAccountPasswordSheet({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    if (busy) return
    setPassword("")
    setError(null)
    onClose()
  }

  async function handleSubmit() {
    const trimmed = password.trim()
    if (!trimmed) {
      setError("Enter your Arciin account password.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onConfirm(trimmed)
      setPassword("")
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify password.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <MobileBottomSheet
      open={open}
      onClose={handleClose}
      title="Verify your account"
      description="Enter your Arciin sign-in password to enable reveal by default on this server."
      ariaLabel="Account password"
    >
      <div className="flex flex-col gap-4">
        <div className="accent-icon-tile mx-auto flex size-14 items-center justify-center rounded-2xl">
          <Lock className="text-accent size-6" />
        </div>

        {error ? (
          <p
            className="rounded-xl px-3 py-2 text-center text-[12px] text-[#b91c1c]"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Arciin account password
          </label>
          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: "#f7f7f7", border: "1.5px solid #e8e8e8" }}
          >
            <Lock className="size-4 shrink-0 text-[#c0c0c0]" />
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your sign-in password"
              autoComplete="current-password"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[#222222] outline-none placeholder:text-[#c0c0c0]"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="shrink-0 rounded-lg p-1 text-[#a0a0a0] active:text-[#717171]"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={busy || !password.trim()}
          onClick={() => void handleSubmit()}
          className="btn-accent-solid flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Confirm
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={handleClose}
          className="h-10 w-full rounded-xl text-[13px] font-semibold text-[#717171] active:bg-[#f0f0f0]"
        >
          Cancel
        </button>
      </div>
    </MobileBottomSheet>
  )
}
