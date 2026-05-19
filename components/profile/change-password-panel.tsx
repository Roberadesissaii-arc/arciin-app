"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { changePassword } from "@/lib/api/auth"
import { formatApiError } from "@/lib/api/errors"

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null
  const score =
    (password.length >= 8 ? 1 : 0) +
    (password.length >= 12 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0)

  const { label, color } =
    score <= 1
      ? { label: "Weak", color: "#ef4444" }
      : score <= 3
        ? { label: "Fair", color: "#f59e0b" }
        : score <= 4
          ? { label: "Good", color: "#38bdf8" }
          : { label: "Strong", color: "#22c55e" }

  return (
    <div className="mt-2 space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f0f0f0]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(score / 5) * 100}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[11px] font-medium" style={{ color }}>
        {label}
      </p>
    </div>
  )
}

export function ChangePasswordPanel() {
  const { connection } = useConnection()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showNext, setShowNext] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm

  async function handleSubmit() {
    if (!connection || !canSubmit) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await changePassword(connection, { currentPassword: current, newPassword: next })
      setCurrent("")
      setNext("")
      setConfirm("")
      setMessage("Password updated.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-xl px-3 py-2 text-[12px] text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl px-3 py-2 text-[12px] text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0]">
          {message}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pw-current" className="text-[12px] font-semibold text-[#717171]">
          Current password
        </label>
        <input
          id="pw-current"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none"
          style={{ border: "1px solid #e5e5e5" }}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pw-new" className="text-[12px] font-semibold text-[#717171]">
          New password
        </label>
        <div className="relative">
          <input
            id="pw-new"
            type={showNext ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl bg-[#f7f7f7] px-4 py-3 pr-11 text-[14px] text-[#222222] outline-none"
            style={{ border: "1px solid #e5e5e5" }}
          />
          <button
            type="button"
            onClick={() => setShowNext((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]"
            aria-label={showNext ? "Hide password" : "Show password"}
          >
            {showNext ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <PasswordStrengthBar password={next} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pw-confirm" className="text-[12px] font-semibold text-[#717171]">
          Confirm new password
        </label>
        <input
          id="pw-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none"
          style={{ border: "1px solid #e5e5e5" }}
        />
      </div>
      <button
        type="button"
        disabled={!canSubmit || busy}
        onClick={() => void handleSubmit()}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff4f12] text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Update password
      </button>
    </div>
  )
}
