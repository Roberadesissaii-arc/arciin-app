"use client"

import { useCallback, useRef, useState } from "react"
import { Loader2, Shield, Trash2 } from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { MobilePillSwitch } from "@/components/settings/mobile-toggle-row"
import { MobileSettingsSegment } from "@/components/settings/mobile-segment"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { formatApiError } from "@/lib/api/errors"
import {
  getApiProtectionStatus,
  getSecuritySettings,
  patchApiProtectionIpRule,
  updateSecuritySettings,
} from "@/lib/api/settings"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import { mobileFieldClass } from "@/lib/ui/mobile-input"
import type { SecuritySettings } from "@/lib/types/models"

const RPM_PRESETS = [
  { label: "Off", value: 0 },
  { label: "120", value: 120 },
  { label: "600", value: 600 },
  { label: "3k", value: 3000 },
  { label: "12k", value: 12000 },
] as const

const KEY_RPM_PRESETS = [
  { label: "Off", value: 0 },
  { label: "60", value: 60 },
  { label: "300", value: 300 },
  { label: "1.2k", value: 1200 },
] as const

const EXPIRY_PRESETS = [
  { label: "Unlimited", value: 0 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "180d", value: 180 },
  { label: "365d", value: 365 },
] as const

function IpList({
  items,
  emptyLabel,
  onRemove,
  busy,
}: {
  items: string[]
  emptyLabel: string
  onRemove: (ip: string) => void
  busy: boolean
}) {
  if (items.length === 0) {
    return <p className="py-1 text-[11px] text-[#a0a0a0]">{emptyLabel}</p>
  }
  return (
    <ul className="flex flex-col gap-1.5 py-1">
      {items.map((ip) => (
        <li
          key={ip}
          className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <code className="font-mono text-[11px] text-[#222222]">{ip}</code>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRemove(ip)}
            className="rounded-md p-1 text-[#717171] active:bg-red-50 active:text-[#dc2626] disabled:opacity-40"
            aria-label={`Remove ${ip}`}
          >
            <Trash2 className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function ApiProtectionForm() {
  const load = useCallback(
    async (connection: Parameters<typeof getSecuritySettings>[0], signal: AbortSignal) => {
      const [settings, status] = await Promise.all([
        getSecuritySettings(connection, signal),
        getApiProtectionStatus(connection, signal),
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
  } = useStablePanelLoad(true, load, { cacheKey: "api-protection" })

  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const [saving, setSaving] = useState(false)
  const [blockIp, setBlockIp] = useState("")
  const [allowIp, setAllowIp] = useState("")
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
      <MutedPanelError error={patchError ?? error} onRetry={() => void reload()} />
    )
  }

  const { settings, status } = data
  const busy = saving

  async function save(patch: Partial<SecuritySettings>, successMessage: string) {
    const conn = connectionRef.current
    if (!conn) return
    setSaving(true)
    setPatchError(null)
    clearStatus()
    const prev = data
    setData({ settings: { ...settings, ...patch }, status })
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

  async function patchIp(action: "block" | "allow" | "unblock" | "disallow", ip: string) {
    const conn = connectionRef.current
    if (!conn) return
    setSaving(true)
    setPatchError(null)
    clearStatus()
    try {
      const result = await patchApiProtectionIpRule(conn, { action, ip })
      setData({
        settings: {
          ...settings,
          ipBlocklist: result.ipBlocklist,
          ipAllowlist: result.ipAllowlist,
        },
        status,
      })
      showStatus(action === "block" ? "IP blocked" : action === "allow" ? "IP allowed" : "IP rule removed")
    } catch (err) {
      setPatchError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showingCachedOffline ? <OfflineCachedNotice revalidating={isRevalidating} /> : null}

      <SettingsIntroCard
        icon={Shield}
        title="API protection"
        description="Rate limits and IP rules — same as desktop Settings → API protection."
      />

      {status.requestsThisMinute != null ? (
        <p className="text-[11px] text-[#717171]">
          {status.activeApiKeys} active API key{status.activeApiKeys === 1 ? "" : "s"} ·{" "}
          {status.requestsThisMinute} requests this minute
        </p>
      ) : null}

      <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
        <MobileSettingsSegment
          label="Global rate limit (req/min)"
          options={RPM_PRESETS}
          value={settings.apiGlobalRequestsPerMinute}
          disabled={busy}
          onChange={(value) =>
            void save({ apiGlobalRequestsPerMinute: value }, "Global rate limit updated")
          }
        />
        <div className="h-px bg-[#ececec]" />
        <MobileSettingsSegment
          label="Per API key limit (req/min)"
          options={KEY_RPM_PRESETS}
          value={settings.apiKeyRequestsPerMinute}
          disabled={busy}
          onChange={(value) =>
            void save({ apiKeyRequestsPerMinute: value }, "Per-key rate limit updated")
          }
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Require API key expiry"
          hint="New keys must have an expiration date"
          on={settings.requireApiKeyExpiry}
          disabled={busy}
          onChange={() => {
            const next = !settings.requireApiKeyExpiry
            void save(
              { requireApiKeyExpiry: next },
              next ? "API key expiry required" : "API key expiry optional",
            )
          }}
        />
        {settings.requireApiKeyExpiry ? (
          <>
            <div className="h-px bg-[#ececec]" />
            <MobileSettingsSegment
              label="Max key lifetime"
              options={EXPIRY_PRESETS}
              value={settings.maxApiKeyExpiryDays}
              disabled={busy}
              onChange={(value) =>
                void save({ maxApiKeyExpiryDays: value }, "Max API key lifetime updated")
              }
            />
          </>
        ) : null}
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Enforce IP allowlist"
          hint="Only allowlisted IPs can use the API when enabled"
          on={settings.enforceIpAllowlist}
          disabled={busy}
          onChange={() => {
            const next = !settings.enforceIpAllowlist
            void save(
              { enforceIpAllowlist: next },
              next ? "IP allowlist enforced" : "IP allowlist not enforced",
            )
          }}
        />
      </div>

      <div className="rounded-xl bg-white px-3 py-3" style={{ border: "1px solid #e5e5e5" }}>
        <p className="text-[13px] font-medium text-[#222222]">Block IP</p>
        <div className="mt-2 flex gap-2">
          <input
            value={blockIp}
            onChange={(e) => setBlockIp(e.target.value)}
            placeholder="203.0.113.10"
            className={`${mobileFieldClass} rounded-lg px-3 py-2 font-mono text-[12px]`}
          />
          <button
            type="button"
            disabled={busy || !blockIp.trim()}
            onClick={() => {
              const ip = blockIp.trim()
              setBlockIp("")
              void patchIp("block", ip)
            }}
            className="shrink-0 rounded-lg bg-[#222222] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            Block
          </button>
        </div>
        <IpList
          items={settings.ipBlocklist}
          emptyLabel="No blocked IPs"
          busy={busy}
          onRemove={(ip) => void patchIp("unblock", ip)}
        />
      </div>

      <div className="rounded-xl bg-white px-3 py-3" style={{ border: "1px solid #e5e5e5" }}>
        <p className="text-[13px] font-medium text-[#222222]">Allow IP</p>
        <div className="mt-2 flex gap-2">
          <input
            value={allowIp}
            onChange={(e) => setAllowIp(e.target.value)}
            placeholder="198.51.100.4"
            className={`${mobileFieldClass} rounded-lg px-3 py-2 font-mono text-[12px]`}
          />
          <button
            type="button"
            disabled={busy || !allowIp.trim()}
            onClick={() => {
              const ip = allowIp.trim()
              setAllowIp("")
              void patchIp("allow", ip)
            }}
            className="shrink-0 rounded-lg border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2 text-[11px] font-semibold text-[#222222] disabled:opacity-50"
          >
            Allow
          </button>
        </div>
        <IpList
          items={settings.ipAllowlist}
          emptyLabel="No allowlisted IPs"
          busy={busy}
          onRemove={(ip) => void patchIp("disallow", ip)}
        />
      </div>

      <PanelStatusBanner message={message} />
      {patchError ? <MutedPanelError error={patchError} /> : null}
    </div>
  )
}

export function ApiProtectionInlinePanel({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  return (
    <AdminSettingsGate feature="API protection">
      <ApiProtectionForm />
    </AdminSettingsGate>
  )
}
