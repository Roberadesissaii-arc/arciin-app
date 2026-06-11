"use client"

import { useCallback, useRef, useState } from "react"
import { Loader2, Users } from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { MobilePillSwitch } from "@/components/settings/mobile-toggle-row"
import { MobileSettingsSegment } from "@/components/settings/mobile-segment"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { formatApiError } from "@/lib/api/errors"
import {
  getAccessControlStatus,
  getSecuritySettings,
  revokeAllSessionsExceptCurrent,
  updateSecuritySettings,
} from "@/lib/api/settings"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { SecuritySettings } from "@/lib/types/models"

const TIMEOUT_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "2 hrs", value: 120 },
  { label: "8 hrs", value: 480 },
  { label: "24 hrs", value: 1440 },
  { label: "7 days", value: 10080 },
] as const

const MAX_FAILED_OPTIONS = [
  { label: "3", value: 3 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
] as const

export function AccessControlInlinePanel({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  return (
    <AdminSettingsGate feature="Access control">
      <AccessControlForm />
    </AdminSettingsGate>
  )
}

function AccessControlForm() {
  const load = useCallback(
    async (connection: Parameters<typeof getSecuritySettings>[0], signal: AbortSignal) => {
      const [settings, status] = await Promise.all([
        getSecuritySettings(connection, signal),
        getAccessControlStatus(connection, signal),
      ])
      return { settings, status }
    },
    [],
  )

  const {
    data,
    loading,
    error,
    showingCachedOffline,
    isRevalidating,
    connection,
    setData,
    reload,
  } = useStablePanelLoad(true, load, { cacheKey: "access-control" })

  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage()

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        <MutedPanelError error={patchError ?? error} onRetry={() => void reload()} />
      </div>
    )
  }

  const settings = data.settings
  const status = data.status
  const busy = saving || revoking

  async function save(patch: Partial<SecuritySettings>, successMessage: string) {
    const conn = connectionRef.current
    if (!conn) return
    setSaving(true)
    setPatchError(null)
    clearStatus()
    const prev = data
    setData({
      settings: { ...settings, ...patch },
      status,
    })
    try {
      const updated = await updateSecuritySettings(conn, patch)
      setData({ settings: updated, status })
      showStatus(successMessage)
    } catch (err) {
      if (prev) setData(prev)
      setPatchError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleRevokeOthers() {
    const conn = connectionRef.current
    if (!conn) return
    setRevoking(true)
    setPatchError(null)
    clearStatus()
    try {
      const result = await revokeAllSessionsExceptCurrent(conn)
      showStatus(
        result.revoked === 0
          ? "No other sessions to revoke."
          : `Revoked ${result.revoked} session${result.revoked === 1 ? "" : "s"}.`,
      )
      await reload()
    } catch (err) {
      setPatchError(formatApiError(err))
    } finally {
      setRevoking(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showingCachedOffline ? <OfflineCachedNotice revalidating={isRevalidating} /> : null}

      <SettingsIntroCard
        icon={Users}
        title="Access control"
        description="Sign-in policies for this Arciin instance — same options as desktop Settings."
      />

      <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
        <MobilePillSwitch
          label="Public signup"
          hint="Allow new member accounts via registration"
          on={settings.publicSignupEnabled}
          disabled={busy}
          onChange={() => {
            const next = !settings.publicSignupEnabled
            void save(
              { publicSignupEnabled: next },
              next ? "Public signup enabled" : "Public signup disabled",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobileSettingsSegment
          label="Session lifetime"
          options={TIMEOUT_OPTIONS}
          value={settings.sessionTimeoutMinutes}
          disabled={busy}
          onChange={(value) =>
            void save({ sessionTimeoutMinutes: value }, "Session lifetime updated")
          }
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Login failure alerts"
          hint="Record failed sign-in attempts in activity"
          on={settings.loginAlertsEnabled}
          disabled={busy}
          onChange={() => {
            const next = !settings.loginAlertsEnabled
            void save(
              { loginAlertsEnabled: next },
              next ? "Login alerts enabled" : "Login alerts disabled",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobileSettingsSegment
          label="Max failed logins"
          options={MAX_FAILED_OPTIONS}
          value={settings.maxFailedLogins}
          disabled={busy}
          onChange={(value) => void save({ maxFailedLogins: value }, `Max failed logins: ${value}`)}
        />
      </div>

      <div className="rounded-xl bg-white px-3 py-3" style={{ border: "1px solid #e5e5e5" }}>
        <p className="text-[13px] font-medium text-[#222222]">Sign out other devices</p>
        <p className="mt-0.5 text-[11px] text-[#a0a0a0]">
          {status.activeSessions != null
            ? `${status.activeSessions} active session${status.activeSessions === 1 ? "" : "s"} on this instance`
            : "End every session except this phone"}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRevokeOthers()}
          className="mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] text-[12px] font-semibold text-[#222222] disabled:opacity-50"
        >
          {revoking ? "Revoking…" : "Revoke other sessions"}
        </button>
      </div>

      <PanelStatusBanner message={message} />
      {patchError ? <MutedPanelError error={patchError} /> : null}
    </div>
  )
}
