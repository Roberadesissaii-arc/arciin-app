"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, CloudUpload, Loader2, Shield, Zap } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { getUserPreferences, updateUserPreferences } from "@/lib/api/user-preferences"
import type { NotificationPreferences } from "@/lib/types/models"

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
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[#222222]">{label}</p>
        {sub && <p className="text-[11px] text-[#a0a0a0]">{sub}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative shrink-0 disabled:opacity-50"
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          backgroundColor: checked ? "#ff4f12" : "#e5e5e5",
        }}
      >
        <span
          className="absolute top-[3px] size-5 rounded-full bg-white shadow-sm transition-transform"
          style={{ left: 3, transform: checked ? "translateX(18px)" : "translateX(0)" }}
        />
      </button>
    </div>
  )
}

function Divider() {
  return <div className="mx-4 h-px bg-[#f0f0f0]" />
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
      {label}
    </p>
  )
}

export function NotificationsSettingsPage() {
  const { connection, ready } = useConnection()
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !connection) return
    let cancelled = false
    const ac = new AbortController()

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getUserPreferences(connection, ac.signal)
        if (!cancelled) setPrefs(data.notifications)
      } catch (err) {
        if (!cancelled) setError(formatApiError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [connection, ready])

  const patch = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      if (!connection || !prefs) return
      const next = { ...prefs, [key]: value }
      setPrefs(next)
      setSaving(true)
      setError(null)
      try {
        const data = await updateUserPreferences(connection, {
          notifications: { [key]: value },
        })
        setPrefs(data.notifications)
      } catch (err) {
        setPrefs(prefs)
        setError(formatApiError(err))
      } finally {
        setSaving(false)
      }
    },
    [connection, prefs],
  )

  if (!ready || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#a0a0a0]" />
      </div>
    )
  }

  if (!prefs) {
    return <p className="text-center text-[13px] text-[#717171]">{error ?? "Could not load preferences."}</p>
  }

  const channels = [
    { icon: Bell, label: "Upload sound", enabled: prefs.uploadSound },
    { icon: CloudUpload, label: "Upload complete", enabled: prefs.uploadCompleteToast },
    { icon: Zap, label: "Upload failed", enabled: prefs.uploadFailedToast },
    { icon: Bell, label: "Activity feed", enabled: prefs.activityFeedToast },
    { icon: Shield, label: "Security events", enabled: prefs.securityEventsToast },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel label="In-app notifications" />
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
          <Toggle
            label="Upload sound"
            sub="Play a sound when uploads finish"
            checked={prefs.uploadSound}
            disabled={saving}
            onChange={(v) => void patch("uploadSound", v)}
          />
          <Divider />
          <Toggle
            label="Upload complete"
            sub="Toast when a file finishes uploading"
            checked={prefs.uploadCompleteToast}
            disabled={saving}
            onChange={(v) => void patch("uploadCompleteToast", v)}
          />
          <Divider />
          <Toggle
            label="Upload failed"
            sub="Toast when an upload fails"
            checked={prefs.uploadFailedToast}
            disabled={saving}
            onChange={(v) => void patch("uploadFailedToast", v)}
          />
          <Divider />
          <Toggle
            label="Activity feed"
            sub="Toast for new activity events"
            checked={prefs.activityFeedToast}
            disabled={saving}
            onChange={(v) => void patch("activityFeedToast", v)}
          />
          <Divider />
          <Toggle
            label="Security events"
            sub="Login and session alerts"
            checked={prefs.securityEventsToast}
            disabled={saving}
            onChange={(v) => void patch("securityEventsToast", v)}
          />
        </div>
      </div>

      <div>
        <SectionLabel label="Summary" />
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
          {channels.map(({ icon: Icon, label, enabled }, i) => (
            <div key={label}>
              {i > 0 && <Divider />}
              <div className="flex items-center gap-3.5 px-4 py-3">
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
                  style={{ border: "1px solid #e5e5e5" }}
                >
                  <Icon className="size-[13px] text-[#717171]" />
                </div>
                <p className="flex-1 text-[13px] text-[#222222]">{label}</p>
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{
                    backgroundColor: enabled ? "rgba(34,197,94,0.08)" : "#f7f7f7",
                    color: enabled ? "#16a34a" : "#a0a0a0",
                  }}
                >
                  {enabled ? "On" : "Off"}
                </span>
              </div>
            </div>
          ))}
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
    </div>
  )
}
