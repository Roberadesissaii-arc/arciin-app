"use client"

import { useCallback, useState } from "react"
import { Loader2, Shield } from "lucide-react"

import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { getSessions, revokeSession } from "@/lib/api/auth"
import { formatApiError } from "@/lib/api/errors"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { SessionDetail } from "@/lib/types/models"
import { formatRelativeDate } from "@/lib/utils/format-date"
import { parseUserAgent } from "@/lib/utils/parse-user-agent"
import { formatSessionIp } from "@/lib/utils/session-ip"

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
    <div className="flex items-center gap-3 py-2.5">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: session.isCurrent ? "rgba(255,79,18,0.08)" : "#fff",
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
          {session.isCurrent ? (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: "rgba(255,79,18,0.1)", color: "#ff4f12" }}
            >
              This device
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-[#a0a0a0]">
          {formatSessionIp(session.ipAddress)} · {formatRelativeDate(session.createdAt)}
        </p>
      </div>
      {!session.isCurrent ? (
        <button
          type="button"
          disabled={revoking}
          onClick={onRevoke}
          className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium text-[#dc2626] active:bg-red-50 disabled:opacity-50"
          style={{ border: "1px solid #fecaca" }}
        >
          {revoking ? "…" : "Revoke"}
        </button>
      ) : null}
    </div>
  )
}

export function SessionsInlinePanel({ enabled }: { enabled: boolean }) {
  const load = useCallback(
    (connection: Parameters<typeof getSessions>[0], signal: AbortSignal) =>
      getSessions(connection, signal),
    [],
  )

  const { data: sessions, loading, error, connection, reload } = useStablePanelLoad(
    enabled,
    load,
  )
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleRevoke(id: string) {
    if (!connection) return
    setRevokingId(id)
    setActionError(null)
    try {
      await revokeSession(connection, id)
      reload()
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setRevokingId(null)
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

  if (error && !sessions) {
    return <p className="text-[12px] text-[#b91c1c]">{error}</p>
  }

  const list = sessions ?? []

  return (
    <div className="flex flex-col gap-4">
      <SettingsIntroCard
        icon={Shield}
        title="Sessions"
        description="Devices signed in to this instance. Revoke any session you do not recognize."
      />

      {list.length === 0 ? (
        <p className="text-[12px] text-[#a0a0a0]">No sessions found.</p>
      ) : (
        <div
          className="divide-y divide-[#f0f0f0] rounded-xl bg-[#f7f7f7] px-3"
          style={{ border: "1px solid #e5e5e5" }}
        >
          {list.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              revoking={revokingId === s.id}
              onRevoke={() => void handleRevoke(s.id)}
            />
          ))}
        </div>
      )}

      {actionError ? <p className="text-[12px] text-[#b91c1c]">{actionError}</p> : null}
    </div>
  )
}
