"use client"

import { useCallback, useRef, useState } from "react"
import { Globe, Loader2, Moon, Settings, Sun } from "lucide-react"

import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { formatApiError } from "@/lib/api/errors"
import { getUserPreferences, updateUserPreferences } from "@/lib/api/user-preferences"
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

export function PreferencesInlinePanel({ enabled }: { enabled: boolean }) {
  const load = useCallback(
    (connection: Parameters<typeof getUserPreferences>[0], signal: AbortSignal) =>
      getUserPreferences(connection, signal),
    [],
  )

  const { data: prefs, loading, error, connection, setData } = useStablePanelLoad(
    enabled,
    load,
    { cacheKey: "preferences" },
  )
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
    return <p className="text-[12px] text-[#717171]">{patchError ?? error ?? "Could not load preferences."}</p>
  }

  async function patchAppearance(patch: Partial<UserPreferences["appearance"]>) {
    const conn = connectionRef.current
    if (!conn || !prefs) return
    setSaving(true)
    setPatchError(null)
    const prev = prefs
    setData({ ...prefs, appearance: { ...prefs.appearance, ...patch } })
    try {
      const data = await updateUserPreferences(conn, { appearance: patch })
      setData(data)
    } catch (err) {
      if (prev) setData(prev)
      setPatchError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function patchAccessibility(patch: Partial<UserPreferences["accessibility"]>) {
    const conn = connectionRef.current
    if (!conn || !prefs) return
    setSaving(true)
    setPatchError(null)
    const prev = prefs
    setData({ ...prefs, accessibility: { ...prefs.accessibility, ...patch } })
    try {
      const data = await updateUserPreferences(conn, { accessibility: patch })
      setData(data)
    } catch (err) {
      if (prev) setData(prev)
      setPatchError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsIntroCard
        icon={Settings}
        title="Preferences"
        description="Tune how Arciin looks and feels on this device. Changes sync to your account on this instance."
      />

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Appearance
        </p>
        <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
          <div className="flex gap-2 py-2">
            {(["Light", "Dark"] as const).map((theme) => {
              const isLight = theme === "Light"
              const active = isLight
              return (
                <button
                  key={theme}
                  type="button"
                  disabled={!active || saving}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-xl py-2.5 text-[12px] font-semibold"
                  style={{
                    backgroundColor: active ? "#fff4f0" : "#fff",
                    border: `1px solid ${active ? "#ff4f12" : "#e5e5e5"}`,
                    color: active ? "#ff4f12" : "#717171",
                  }}
                >
                  {isLight ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {theme}
                </button>
              )
            })}
          </div>
          <div className="h-px bg-[#ececec]" />
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
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Accessibility
        </p>
        <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
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
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-[#f7f7f7] px-3 py-3" style={{ border: "1px solid #e5e5e5" }}>
        <Globe className="size-4 text-[#717171]" />
        <div className="flex-1">
          <p className="text-[13px] font-medium text-[#222222]">Language</p>
          <p className="text-[11px] text-[#a0a0a0]">English (US)</p>
        </div>
        <span className="text-[10px] font-semibold text-[#a0a0a0]">Soon</span>
      </div>

      {patchError ? (
        <p className="text-[12px] text-[#b91c1c]">{patchError}</p>
      ) : null}

    </div>
  )
}
