"use client"

import { useCallback, useEffect, useState } from "react"
import { Globe, Loader2, Moon, Sun } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { getUserPreferences, updateUserPreferences } from "@/lib/api/user-preferences"
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

export function PreferencesPage() {
  const { connection, ready } = useConnection()
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
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
        if (!cancelled) setPrefs(data)
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

  const patchAppearance = useCallback(
    async (patch: Partial<UserPreferences["appearance"]>) => {
      if (!connection || !prefs) return
      setSaving(true)
      setError(null)
      const prev = prefs
      setPrefs({
        ...prefs,
        appearance: { ...prefs.appearance, ...patch },
      })
      try {
        const data = await updateUserPreferences(connection, { appearance: patch })
        setPrefs(data)
      } catch (err) {
        setPrefs(prev)
        setError(formatApiError(err))
      } finally {
        setSaving(false)
      }
    },
    [connection, prefs],
  )

  const patchAccessibility = useCallback(
    async (patch: Partial<UserPreferences["accessibility"]>) => {
      if (!connection || !prefs) return
      setSaving(true)
      setError(null)
      const prev = prefs
      setPrefs({
        ...prefs,
        accessibility: { ...prefs.accessibility, ...patch },
      })
      try {
        const data = await updateUserPreferences(connection, { accessibility: patch })
        setPrefs(data)
      } catch (err) {
        setPrefs(prev)
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel label="Appearance" />
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
          <div className="flex gap-3 px-4 py-3.5">
            {(["Light", "Dark"] as const).map((theme) => {
              const isLight = theme === "Light"
              const active = isLight
              return (
                <button
                  key={theme}
                  type="button"
                  disabled={!active}
                  className="flex flex-1 flex-col items-center gap-2 rounded-xl py-3 text-[13px] font-semibold transition-colors"
                  style={{
                    backgroundColor: active ? "#fff4f0" : "#f7f7f7",
                    border: `1px solid ${active ? "#ff4f12" : "#e5e5e5"}`,
                    color: active ? "#ff4f12" : "#717171",
                  }}
                >
                  {isLight ? <Sun className="size-5" /> : <Moon className="size-5" />}
                  {theme}
                  {!isLight && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-[#a0a0a0]"
                      style={{ border: "1px solid #e5e5e5", backgroundColor: "#f0f0f0" }}
                    >
                      Soon
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <Divider />
          <Toggle
            label="Compact view"
            sub="Smaller cards in file grids"
            checked={prefs.appearance.compactView}
            disabled={saving}
            onChange={(v) => void patchAppearance({ compactView: v })}
          />
          <Divider />
          <Toggle
            label="Animated cards"
            sub="Subtle motion on lists and cards"
            checked={prefs.appearance.animatedCards}
            disabled={saving}
            onChange={(v) => void patchAppearance({ animatedCards: v })}
          />
        </div>
      </div>

      <div>
        <SectionLabel label="Accessibility" />
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
          <Toggle
            label="Reduce animations"
            sub="Minimize motion across the app"
            checked={prefs.accessibility.reduceAnimations}
            disabled={saving}
            onChange={(v) => void patchAccessibility({ reduceAnimations: v })}
          />
          <Divider />
          <Toggle
            label="High contrast"
            sub="Stronger borders and text contrast"
            checked={prefs.accessibility.highContrast}
            disabled={saving}
            onChange={(v) => void patchAccessibility({ highContrast: v })}
          />
        </div>
      </div>

      <div>
        <SectionLabel label="Language & region" />
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
          <div className="flex items-center gap-3.5 px-4 py-3.5">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "#f7f7f7", border: "1px solid #e5e5e5" }}
            >
              <Globe className="size-[15px] text-[#717171]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[#222222]">Language</p>
              <p className="text-[11px] text-[#a0a0a0]">English (US)</p>
            </div>
            <span
              className="rounded-full bg-[#f7f7f7] px-2.5 py-1 text-[11px] text-[#a0a0a0]"
              style={{ border: "1px solid #e5e5e5" }}
            >
              Coming soon
            </span>
          </div>
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
