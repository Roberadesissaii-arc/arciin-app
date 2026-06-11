"use client"

import Link from "next/link"
import { useCallback, useRef, useState } from "react"
import { Bell, ChevronRight, Loader2, Volume2 } from "lucide-react"

import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { formatApiError } from "@/lib/api/errors"
import { getUserPreferences, updateUserPreferences } from "@/lib/api/user-preferences"
import { setActiveUserPreferences } from "@/lib/preferences/preferences-store"
import { playUploadCompleteSound } from "@/lib/preferences/upload-sound"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { UserPreferences } from "@/lib/types/models"

function Toggle({
  label,
  sub,
  checked,
  disabled,
  onChange,
}: {
  label: string
  sub?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[#222222]">{label}</p>
        {sub ? <p className="text-[11px] text-[#a0a0a0]">{sub}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="accent-switch relative shrink-0 disabled:opacity-50"
      >
        <span
          className="absolute top-[3px] size-5 rounded-full bg-white shadow-sm transition-transform"
          style={{ left: 3, transform: checked ? "translateX(18px)" : "translateX(0)" }}
        />
      </button>
    </div>
  )
}

export function NotificationsInlinePanel({ enabled }: { enabled: boolean }) {
  const load = useCallback(
    (connection: Parameters<typeof getUserPreferences>[0], signal: AbortSignal) =>
      getUserPreferences(connection, signal),
    [],
  )

  const {
    data: prefs,
    loading,
    error,
    showingCachedOffline,
    isRevalidating,
    connection,
    setData,
    reload,
  } = useStablePanelLoad(enabled, load, { cacheKey: "notifications-prefs" })
  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const [saving, setSaving] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)

  if (!enabled) return null

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  if (!prefs) {
    return (
      <div className="flex flex-col gap-3">
        <MutedPanelError error={patchError ?? error} onRetry={() => void reload()} />
      </div>
    )
  }

  async function patchNotifications(patch: Partial<UserPreferences["notifications"]>) {
    const conn = connectionRef.current
    if (!conn || !prefs) return
    setSaving(true)
    setPatchError(null)
    const prev = prefs
    const optimistic = { ...prefs, notifications: { ...prefs.notifications, ...patch } }
    setData(optimistic)
    setActiveUserPreferences(optimistic)
    try {
      const data = await updateUserPreferences(conn, { notifications: patch })
      setData(data)
      setActiveUserPreferences(data)
    } catch (err) {
      if (prev) {
        setData(prev)
        setActiveUserPreferences(prev)
      }
      setPatchError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showingCachedOffline ? (
        <OfflineCachedNotice revalidating={isRevalidating} />
      ) : null}

      <SettingsIntroCard
        icon={Bell}
        title="Activity notifications"
        description="Uploads and events from your server appear in the notifications list (bell on Home). Pop-up toasts in settings below apply when you use Arciin in a desktop browser."
      />

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          On this phone
        </p>
        <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
          <Toggle
            label="Upload complete sound"
            sub="Play a sound when an upload finishes in the app"
            checked={prefs.notifications.uploadSound}
            disabled={saving}
            onChange={(v) => void patchNotifications({ uploadSound: v })}
          />
          <button
            type="button"
            disabled={saving || !prefs.notifications.uploadSound}
            onClick={() => playUploadCompleteSound()}
            className="mb-2 w-full rounded-lg border border-[#e5e5e5] bg-white py-2 text-[12px] font-semibold text-[#717171] disabled:opacity-50"
          >
            Test sound
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Desktop browser (synced to your account)
        </p>
        <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
          <Toggle
            label="Upload complete toast"
            checked={prefs.notifications.uploadCompleteToast}
            disabled={saving}
            onChange={(v) => void patchNotifications({ uploadCompleteToast: v })}
          />
          <div className="h-px bg-[#ececec]" />
          <Toggle
            label="Upload failed toast"
            checked={prefs.notifications.uploadFailedToast}
            disabled={saving}
            onChange={(v) => void patchNotifications({ uploadFailedToast: v })}
          />
          <div className="h-px bg-[#ececec]" />
          <Toggle
            label="Activity feed toast"
            checked={prefs.notifications.activityFeedToast}
            disabled={saving}
            onChange={(v) => void patchNotifications({ activityFeedToast: v })}
          />
          <div className="h-px bg-[#ececec]" />
          <Toggle
            label="Security events toast"
            checked={prefs.notifications.securityEventsToast}
            disabled={saving}
            onChange={(v) => void patchNotifications({ securityEventsToast: v })}
          />
        </div>
      </div>

      <Link
        href="/notifications"
        className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 active:bg-[#f7f7f7]"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="empty-state-icon flex size-9 items-center justify-center rounded-xl">
          <Bell className="text-accent size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">Open notifications feed</p>
          <p className="text-[11px] text-[#a0a0a0]">Recent uploads, files, and security activity</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-[#c0c0c0]" />
      </Link>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[#a0a0a0]">
        <Volume2 className="mt-0.5 size-3.5 shrink-0" />
        <span>
          For read-aloud on AI replies, use the speaker button under each chat message on the Chat
          tab.
        </span>
      </p>

      {patchError ? <MutedPanelError error={patchError} /> : null}
    </div>
  )
}
