"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import {
  changePassword,
  getSessions,
  revokeSession,
} from "@/lib/api/auth"
import { formatApiError } from "@/lib/api/errors"
import type { SessionDetail } from "@/lib/types/models"
import { formatRelativeDate } from "@/lib/utils/format-date"
import { parseUserAgent } from "@/lib/utils/parse-user-agent"
import { formatSessionIp } from "@/lib/utils/session-ip"

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
      {label}
    </p>
  )
}

function Divider() {
  return <div className="mx-4 h-px bg-[#f0f0f0]" />
}

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

function SessionRow({
  session,
  revoking,
  onRevoke,
}: {
  session: SessionDetail
  revoking: boolean
  onRevoke: () => void
}) {
  const { label, DeviceIcon } = parseUserAgent(session.userAgent)
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: session.isCurrent ? "rgba(255,79,18,0.08)" : "#f7f7f7",
          border: `1px solid ${session.isCurrent ? "rgba(255,79,18,0.25)" : "#e5e5e5"}`,
        }}
      >
        <DeviceIcon
          className="size-[15px]"
          style={{ color: session.isCurrent ? "#ff4f12" : "#717171" }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-[#222222]">{label}</p>
          {session.isCurrent && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: "rgba(255,79,18,0.1)", color: "#ff4f12" }}
            >
              This device
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#a0a0a0]">
          {formatSessionIp(session.ipAddress)} · Started {formatRelativeDate(session.createdAt)}
        </p>
      </div>
      {!session.isCurrent && (
        <button
          type="button"
          disabled={revoking}
          onClick={onRevoke}
          className="shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-medium text-[#dc2626] transition-colors active:bg-red-50 disabled:opacity-50"
          style={{ border: "1px solid #fecaca" }}
        >
          {revoking ? "…" : "Revoke"}
        </button>
      )}
    </div>
  )
}

export function SecurityPage() {
  const { connection, ready } = useConnection()
  const [sessions, setSessions] = useState<SessionDetail[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showNext, setShowNext] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !connection) return
    let cancelled = false
    const ac = new AbortController()

    void (async () => {
      setSessionsLoading(true)
      try {
        const list = await getSessions(connection, ac.signal)
        if (!cancelled) setSessions(list)
      } catch (err) {
        if (!cancelled) setError(formatApiError(err))
      } finally {
        if (!cancelled) setSessionsLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [connection, ready])

  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm
  const matches = next.length >= 8 && next === confirm && confirm.length > 0
  const canSubmit = current.length > 0 && next.length >= 8 && next === confirm

  async function handlePasswordUpdate() {
    if (!connection || !canSubmit) return
    setPasswordBusy(true)
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
      setPasswordBusy(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!connection) return
    setRevokingId(id)
    setError(null)
    try {
      await revokeSession(connection, id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel label="Active sessions" />
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
          {sessionsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-[#a0a0a0]" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-[#a0a0a0]">No sessions found.</p>
          ) : (
            sessions.map((s, i) => (
              <div key={s.id}>
                {i > 0 && <Divider />}
                <SessionRow
                  session={s}
                  revoking={revokingId === s.id}
                  onRevoke={() => void handleRevoke(s.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <SectionLabel label="Change password" />
        <div
          className="flex flex-col gap-4 rounded-2xl bg-white p-5"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sec-current" className="text-[12px] font-semibold text-[#717171]">
              Current password
            </label>
            <input
              id="sec-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none placeholder-[#a0a0a0] focus:bg-white"
              style={{ border: "1px solid #e5e5e5" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sec-new" className="text-[12px] font-semibold text-[#717171]">
              New password
            </label>
            <div className="relative">
              <input
                id="sec-new"
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="w-full rounded-xl bg-[#f7f7f7] px-4 py-3 pr-10 text-[14px] text-[#222222] outline-none placeholder-[#a0a0a0] focus:bg-white"
                style={{ border: "1px solid #e5e5e5" }}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showNext ? "Hide" : "Show"}
                onClick={() => setShowNext((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]"
              >
                {showNext ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <PasswordStrengthBar password={next} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="sec-confirm" className="text-[12px] font-semibold text-[#717171]">
              Confirm new password
            </label>
            <input
              id="sec-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none placeholder-[#a0a0a0] focus:bg-white"
              style={{ border: "1px solid #e5e5e5" }}
            />
            {mismatch && <p className="text-[11px] text-red-600">Passwords do not match.</p>}
            {matches && (
              <p className="flex items-center gap-1 text-[11px] text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Passwords match
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!canSubmit || passwordBusy}
            onClick={() => void handlePasswordUpdate()}
            className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-40 active:opacity-80"
            style={{ backgroundColor: "#ff4f12" }}
          >
            {passwordBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            Update password
          </button>
        </div>
      </div>

      {error ? (
        <p
          className="rounded-xl px-4 py-3 text-center text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-xl px-4 py-3 text-center text-[12px] text-[#15803d]"
          style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
