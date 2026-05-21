"use client"

import { useCallback, useState } from "react"
import { ChevronDown, Loader2, PackagePlus, Plug } from "lucide-react"

import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { listIntegrations } from "@/lib/api/settings"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { IntegrationSummary } from "@/lib/types/models"

const INTEGRATION_META: Record<
  string,
  { description: string; color: string; hint: string; comingSoon?: boolean }
> = {
  PLEX: {
    description: "Stream your media library via Plex Media Server.",
    color: "#e5a00d",
    hint: "Use a Plex-compatible folder under Videos. Full Plex API sync is configured on desktop.",
  },
  JELLYFIN: {
    description: "Open-source media server for your collection.",
    color: "#00a4dc",
    hint: "Point Jellyfin at library folders Arciin already manages on disk.",
  },
  EMBY: {
    description: "Personal media server with live TV support.",
    color: "#52b54b",
    hint: "Emby integration is planned for a future release.",
    comingSoon: true,
  },
}

function statusFor(integration: IntegrationSummary, comingSoon?: boolean) {
  if (comingSoon) return { label: "Coming soon", color: "#a0a0a0", bg: "#f7f7f7" }
  if (integration.enabled) return { label: "Enabled", color: "#22c55e", bg: "rgba(34,197,94,0.1)" }
  return { label: "Not connected", color: "#a0a0a0", bg: "#f7f7f7" }
}

function IntegrationRow({
  integration,
  open,
  onToggle,
}: {
  integration: IntegrationSummary
  open: boolean
  onToggle: () => void
}) {
  const meta = INTEGRATION_META[integration.type] ?? {
    description: "Integration for your Arciin instance.",
    color: "#717171",
    hint: "Configure this integration from Arciin on desktop.",
  }
  const status = statusFor(integration, meta.comingSoon)
  const config = integration.config as Record<string, unknown>

  return (
    <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-3.5 text-left active:bg-[#fafafa]"
      >
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${meta.color}18`,
            border: `1px solid ${meta.color}40`,
          }}
        >
          <Plug className="size-5" style={{ color: meta.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#222222]">{integration.name}</p>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-[#a0a0a0]">{meta.description}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: status.bg, color: status.color }}
        >
          {status.label}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[#c0c0c0] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="border-t border-[#f0f0f0] px-3 pb-3 pt-2">
          <p className="text-[12px] leading-relaxed text-[#717171]">{meta.hint}</p>
          {Object.keys(config).length > 0 ? (
            <div className="mt-3 rounded-lg bg-[#f7f7f7] p-2.5 font-mono text-[11px] text-[#555]" style={{ border: "1px solid #ececec" }}>
              {JSON.stringify(config, null, 2)}
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-[#a0a0a0]">No extra configuration stored yet.</p>
          )}
          {!meta.comingSoon ? (
            <p className="mt-3 text-[11px] text-[#a0a0a0]">
              Connect or edit this integration in Arciin on your computer for full setup.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function IntegrationsInlinePanel({ enabled }: { enabled: boolean }) {
  const load = useCallback(
    (connection: Parameters<typeof listIntegrations>[0], signal: AbortSignal) =>
      listIntegrations(connection, signal),
    [],
  )

  const {
    data: integrations,
    loading,
    error,
    showingCachedOffline,
    isRevalidating,
    reload,
  } = useStablePanelLoad(enabled, load, {
    cacheKey: "integrations",
  })
  const [openId, setOpenId] = useState<string | null>(null)

  if (!enabled) return null

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  if (!integrations) {
    return <MutedPanelError error={error} onRetry={() => void reload()} />
  }

  const list = integrations

  return (
    <div className="flex flex-col gap-4">
      {showingCachedOffline ? (
        <OfflineCachedNotice revalidating={isRevalidating} />
      ) : null}
      <SettingsIntroCard
        icon={PackagePlus}
        title="Integrations"
        description="Connect media servers and services. Metadata stays on your instance — integrations sync library structure, not your files to the cloud."
      />

      {list.length === 0 ? (
        <p className="text-[12px] text-[#717171]">No integrations on this instance yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((integration) => (
            <IntegrationRow
              key={integration.id}
              integration={integration}
              open={openId === integration.id}
              onToggle={() =>
                setOpenId((id) => (id === integration.id ? null : integration.id))
              }
            />
          ))}
        </div>
      )}

    </div>
  )
}
