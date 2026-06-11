"use client"

import { useCallback, useRef, useState } from "react"
import { Loader2, Settings } from "lucide-react"

import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { AccentColorPicker } from "@/components/settings/accent-color-picker"
import { MobileSettingsSegment } from "@/components/settings/mobile-segment"
import { VoiceSettingRow } from "@/components/settings/voice-setting-row"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { formatApiError } from "@/lib/api/errors"
import { getUserPreferences, updateUserPreferences } from "@/lib/api/user-preferences"
import { MOBILE_ACCENT_COLORS } from "@/lib/preferences/accent-colors"
import { setActiveUserPreferences } from "@/lib/preferences/preferences-store"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { UserPreferences } from "@/lib/types/models"

const FONT_SIZE_OPTIONS = [
  { label: "Small", value: "Small" },
  { label: "Normal", value: "Normal" },
  { label: "Large", value: "Large" },
  { label: "XL", value: "Extra Large" },
] as const

const UI_RADIUS_OPTIONS = [
  { label: "Comfortable", value: "comfortable" },
  { label: "Compact", value: "compact" },
  { label: "Sharp", value: "sharp" },
] as const

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

export function PreferencesInlinePanel({ enabled }: { enabled: boolean }) {
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
  } = useStablePanelLoad(enabled, load, { cacheKey: "preferences" })
  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const [saving, setSaving] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage(enabled)

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

  async function patchAppearance(patch: Partial<UserPreferences["appearance"]>, msg?: string) {
    const conn = connectionRef.current
    if (!conn || !prefs) return
    setSaving(true)
    setPatchError(null)
    clearStatus()
    const prev = prefs
    const optimistic = { ...prefs, appearance: { ...prefs.appearance, ...patch } }
    setData(optimistic)
    setActiveUserPreferences(optimistic)
    try {
      const data = await updateUserPreferences(conn, { appearance: patch })
      setData(data)
      setActiveUserPreferences(data)
      if (msg) showStatus(msg)
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

  async function patchMedia(patch: Partial<UserPreferences["media"]>, msg?: string) {
    const conn = connectionRef.current
    if (!conn || !prefs) return
    setSaving(true)
    setPatchError(null)
    clearStatus()
    const prev = prefs
    const optimistic = { ...prefs, media: { ...prefs.media, ...patch } }
    setData(optimistic)
    setActiveUserPreferences(optimistic)
    try {
      const data = await updateUserPreferences(conn, { media: patch })
      setData(data)
      setActiveUserPreferences(data)
      if (msg) showStatus(msg)
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

  async function patchAccessibility(
    patch: Partial<UserPreferences["accessibility"]>,
    msg?: string,
  ) {
    const conn = connectionRef.current
    if (!conn || !prefs) return
    setSaving(true)
    setPatchError(null)
    clearStatus()
    const prev = prefs
    const optimistic = { ...prefs, accessibility: { ...prefs.accessibility, ...patch } }
    setData(optimistic)
    setActiveUserPreferences(optimistic)
    try {
      const data = await updateUserPreferences(conn, { accessibility: patch })
      setData(data)
      setActiveUserPreferences(data)
      if (msg) showStatus(msg)
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
        icon={Settings}
        title="Preferences"
        description="Appearance and accessibility — applies on this phone and syncs with desktop."
      />

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Layout
        </p>
        <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
          <Toggle
            label="Compact view"
            sub="Smaller cards in file grids"
            checked={prefs.appearance.compactView}
            disabled={saving}
            onChange={(v) => void patchAppearance({ compactView: v })}
          />
          <div className="h-px bg-[#ececec]" />
          <Toggle
            label="Animated cards"
            checked={prefs.appearance.animatedCards}
            disabled={saving}
            onChange={(v) => void patchAppearance({ animatedCards: v })}
          />
          <div className="h-px bg-[#ececec]" />
          <MobileSettingsSegment
            label="Corner radius"
            options={UI_RADIUS_OPTIONS}
            value={prefs.appearance.uiRadius}
            disabled={saving}
            onChange={(value) =>
              void patchAppearance({ uiRadius: value }, "Corner radius updated")
            }
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Accent color
        </p>
        <AccentColorPicker
          value={prefs.appearance.accentColor}
          disabled={saving}
          onChange={(hex) => {
            const label =
              MOBILE_ACCENT_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.label ??
              "Accent"
            void patchAppearance({ accentColor: hex }, `Accent: ${label}`)
          }}
        />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Files
        </p>
        <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
          <Toggle
            label="PDF previews"
            sub="First-page thumbnails for PDFs in file grids"
            checked={prefs.media.documentThumbnails}
            disabled={saving}
            onChange={(v) =>
              void patchMedia(
                { documentThumbnails: v },
                v ? "PDF previews enabled." : "PDF previews disabled.",
              )
            }
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Accessibility
        </p>
        <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
          <MobileSettingsSegment
            label="Font size"
            options={FONT_SIZE_OPTIONS}
            value={prefs.accessibility.fontSize}
            disabled={saving}
            onChange={(value) =>
              void patchAccessibility({ fontSize: value }, `Font size: ${value}`)
            }
          />
          <div className="h-px bg-[#ececec]" />
          <Toggle
            label="Reduce animations"
            checked={prefs.accessibility.reduceAnimations}
            disabled={saving}
            onChange={(v) => void patchAccessibility({ reduceAnimations: v })}
          />
          <div className="h-px bg-[#ececec]" />
          <Toggle
            label="High contrast"
            checked={prefs.accessibility.highContrast}
            disabled={saving}
            onChange={(v) => void patchAccessibility({ highContrast: v })}
          />
          <div className="h-px bg-[#ececec]" />
          <Toggle
            label="Keyboard navigation hints"
            checked={prefs.accessibility.keyboardNav}
            disabled={saving}
            onChange={(v) => void patchAccessibility({ keyboardNav: v })}
          />
          <div className="h-px bg-[#ececec]" />
          <VoiceSettingRow />
        </div>
      </div>

      <PanelStatusBanner message={message} />
      {patchError ? <MutedPanelError error={patchError} /> : null}
    </div>
  )
}
