"use client"

import { useCallback, useRef, useState } from "react"
import { Loader2, LogOut } from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { MobilePillSwitch } from "@/components/settings/mobile-toggle-row"
import { MobileSettingsSegment } from "@/components/settings/mobile-segment"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { formatApiError } from "@/lib/api/errors"
import { getSecuritySettings, updateSecuritySettings } from "@/lib/api/settings"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { SecuritySettings } from "@/lib/types/models"

const IDLE_TIMEOUT_OPTIONS = [
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "2 hrs", value: 120 },
  { label: "4 hrs", value: 240 },
] as const

export function SessionSecurityInlinePanel({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  return (
    <AdminSettingsGate feature="Idle auto-logout">
      <SessionSecurityForm />
    </AdminSettingsGate>
  )
}

function SessionSecurityForm() {
  const load = useCallback(
    (connection: Parameters<typeof getSecuritySettings>[0], signal: AbortSignal) =>
      getSecuritySettings(connection, signal),
    [],
  )

  const {
    data: settings,
    loading,
    error,
    showingCachedOffline,
    isRevalidating,
    connection,
    setData,
    reload,
  } = useStablePanelLoad(true, load, { cacheKey: "session-security" })

  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const [saving, setSaving] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage()

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex flex-col gap-3">
        <MutedPanelError error={patchError ?? error} onRetry={() => void reload()} />
      </div>
    )
  }

  async function save(patch: Partial<SecuritySettings>, successMessage: string) {
    const conn = connectionRef.current
    if (!conn || !settings) return
    setSaving(true)
    setPatchError(null)
    clearStatus()
    const prev = settings
    setData({ ...settings, ...patch })
    try {
      const updated = await updateSecuritySettings(conn, patch)
      setData(updated)
      showStatus(successMessage)
    } catch (err) {
      if (prev) setData(prev)
      setPatchError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showingCachedOffline ? <OfflineCachedNotice revalidating={isRevalidating} /> : null}

      <SettingsIntroCard
        icon={LogOut}
        title="Session & logout"
        description="Idle auto-logout for browser sessions — same as desktop Settings → Session."
      />

      <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
        <MobilePillSwitch
          label="Idle auto-logout"
          hint="Sign out after no activity in an open tab"
          on={settings.idleLogoutEnabled}
          disabled={saving}
          onChange={() => {
            const next = !settings.idleLogoutEnabled
            void save(
              { idleLogoutEnabled: next },
              next ? "Idle auto-logout enabled" : "Idle auto-logout disabled",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        {!settings.idleLogoutEnabled ? (
          <p className="py-2 text-[11px] text-[#a0a0a0]">
            Turn on idle auto-logout above, then pick how long before sign-out.
          </p>
        ) : null}
        <MobileSettingsSegment
          label="Idle timeout"
          options={IDLE_TIMEOUT_OPTIONS}
          value={settings.idleLogoutMinutes}
          disabled={saving || !settings.idleLogoutEnabled}
          onChange={(value) => void save({ idleLogoutMinutes: value }, "Idle timeout updated")}
        />
      </div>

      <PanelStatusBanner message={message} />
      {patchError ? <MutedPanelError error={patchError} /> : null}
    </div>
  )
}
