"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { useConnection } from "@/components/providers/connection-provider"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { changePassword, setupPasswordRecovery } from "@/lib/api/auth"
import { formatApiError } from "@/lib/api/errors"
import { mobileFieldClass } from "@/lib/ui/mobile-input"

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

export function ChangePasswordPanel({ enabled = true }: { enabled?: boolean }) {
  const { connection, serverReachable } = useConnection()
  const offline = serverReachable === false
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showNext, setShowNext] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage(enabled)
  const {
    message: recoveryMessage,
    showStatus: showRecoveryStatus,
    clearStatus: clearRecoveryStatus,
  } = usePanelStatusMessage(enabled)
  const [recoveryQuestion, setRecoveryQuestion] = useState("")
  const [recoveryAnswer, setRecoveryAnswer] = useState("")
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm

  async function handleSubmit() {
    if (!connection || !canSubmit) return
    setBusy(true)
    setError(null)
    clearStatus()
    try {
      await changePassword(connection, { currentPassword: current, newPassword: next })
      setCurrent("")
      setNext("")
      setConfirm("")
      showStatus("Password updated.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRecoverySetup() {
    if (!connection) return
    const question = recoveryQuestion.trim()
    const answer = recoveryAnswer.trim()
    if (question.length < 4 || answer.length < 2) {
      setRecoveryError("Question needs at least 4 characters; answer at least 2.")
      return
    }
    setRecoveryBusy(true)
    setRecoveryError(null)
    clearRecoveryStatus()
    try {
      await setupPasswordRecovery(connection, { question, answer })
      setRecoveryQuestion("")
      setRecoveryAnswer("")
      showRecoveryStatus(
        "Security question saved — use it on the sign-in screen if you forget your password.",
      )
    } catch (err) {
      setRecoveryError(formatApiError(err))
    } finally {
      setRecoveryBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {offline ? (
        <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[12px] text-[#92400e]">
          Reconnect to your server to change your password.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl px-3 py-2 text-[12px] text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca]">
          {error}
        </p>
      ) : null}
      <PanelStatusBanner message={message} />
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
          placeholder="••••••••"
          disabled={offline}
          className={mobileFieldClass}
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
            placeholder="Min. 8 characters"
            disabled={offline}
            className={`${mobileFieldClass} pr-11`}
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
          placeholder="Repeat new password"
          disabled={offline}
          className={mobileFieldClass}
        />
      </div>
      <button
        type="button"
        disabled={offline || !canSubmit || busy}
        onClick={() => void handleSubmit()}
        className="btn-accent-solid flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Update password
      </button>

      <div className="mt-2 border-t border-[#efefef] pt-4">
        <p className="text-[12px] font-semibold text-[#444444]">Forgot-password recovery</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#717171]">
          Optional security question for resetting your password without email.
        </p>
        {recoveryError ? (
          <p className="mt-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
            {recoveryError}
          </p>
        ) : null}
        {recoveryMessage ? (
          <div className="mt-3">
            <PanelStatusBanner message={recoveryMessage} />
          </div>
        ) : null}
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recovery-question" className="text-[12px] font-semibold text-[#717171]">
              Security question
            </label>
            <input
              id="recovery-question"
              value={recoveryQuestion}
              onChange={(e) => setRecoveryQuestion(e.target.value)}
              placeholder="e.g. First pet's name?"
              disabled={offline}
              className={mobileFieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recovery-answer" className="text-[12px] font-semibold text-[#717171]">
              Security answer
            </label>
            <input
              id="recovery-answer"
              value={recoveryAnswer}
              onChange={(e) => setRecoveryAnswer(e.target.value)}
              placeholder="Your answer"
              autoComplete="off"
              disabled={offline}
              className={mobileFieldClass}
            />
          </div>
          <button
            type="button"
            disabled={
              offline || recoveryBusy || !recoveryQuestion.trim() || !recoveryAnswer.trim()
            }
            onClick={() => void handleRecoverySetup()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e5e5e5] bg-white text-[14px] font-semibold text-[#444444] disabled:opacity-50"
          >
            {recoveryBusy ? <Loader2 className="size-4 animate-spin" /> : null}
            Save security question
          </button>
        </div>
      </div>
    </div>
  )
}
