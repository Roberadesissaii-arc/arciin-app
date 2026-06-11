"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Loader2, MonitorPlay, PackagePlus, Plug, Wrench } from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { MobilePillSwitch } from "@/components/settings/mobile-toggle-row"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { formatApiError } from "@/lib/api/errors"
import {
  getJellyfinStatus,
  getPlexStatus,
  isJellyfinIntegration,
  isPlexIntegration,
  setupJellyfinFolders,
  setupPlexFolders,
  updateJellyfinIntegration,
  updatePlexIntegration,
  type ConnectorStatus,
} from "@/lib/api/integrations"
import { listIntegrations } from "@/lib/api/settings"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { IntegrationSummary } from "@/lib/types/models"

const INTEGRATION_META: Record<string, { description: string; color: string }> = {
  PLEX: {
    description: "Stream your media library via Plex Media Server.",
    color: "#e5a00d",
  },
  JELLYFIN: {
    description: "Open-source media server for your collection.",
    color: "#00a4dc",
  },
  CUSTOM: {
    description: "Custom media connector on your instance.",
    color: "#717171",
  },
}

function MediaConnectorCard({
  integration,
  kind,
  connection,
  onChanged,
}: {
  integration: IntegrationSummary
  kind: "plex" | "jellyfin"
  connection: Parameters<typeof updatePlexIntegration>[0]
  onChanged: () => void
}) {
  const connectionRef = useRef(connection)
  connectionRef.current = connection

  const [status, setStatus] = useState<ConnectorStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage()

  const loadStatus = useCallback(async () => {
    const conn = connectionRef.current
    setStatusLoading(true)
    try {
      const data =
        kind === "plex" ? await getPlexStatus(conn) : await getJellyfinStatus(conn)
      setStatus(data)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setStatusLoading(false)
    }
  }, [kind])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const meta = INTEGRATION_META[integration.type] ?? INTEGRATION_META.CUSTOM
  const folders = status?.folders ?? []
  const allReady = folders.length > 0 && folders.every((f) => f.ready)

  async function toggleEnabled(next: boolean) {
    const conn = connectionRef.current
    setBusy(true)
    setError(null)
    clearStatus()
    try {
      if (kind === "plex") {
        await updatePlexIntegration(conn, { enabled: next })
      } else {
        await updateJellyfinIntegration(conn, { enabled: next })
      }
      showStatus(next ? `${integration.name} enabled` : `${integration.name} disabled`)
      await loadStatus()
      onChanged()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function repairFolders() {
    const conn = connectionRef.current
    setBusy(true)
    setError(null)
    clearStatus()
    try {
      const result =
        kind === "plex"
          ? await setupPlexFolders(conn)
          : await setupJellyfinFolders(conn)
      showStatus(
        result.created > 0
          ? `Created ${result.created} folder(s).`
          : "All library folders are already set up.",
      )
      await loadStatus()
      onChanged()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
      <div className="flex items-center gap-3 px-3 py-3.5">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${meta.color}18`,
            border: `1px solid ${meta.color}40`,
          }}
        >
          <MonitorPlay className="size-5" style={{ color: meta.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#222222]">{integration.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-[#a0a0a0]">{meta.description}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor: integration.enabled ? "rgba(34,197,94,0.1)" : "#f7f7f7",
            color: integration.enabled ? "#22c55e" : "#a0a0a0",
          }}
        >
          {integration.enabled ? "Enabled" : "Off"}
        </span>
      </div>

      <div className="border-t border-[#f0f0f0] px-3 py-2">
        <MobilePillSwitch
          label={`Enable ${integration.name}`}
          hint="Routes uploads into connector folders under your libraries"
          on={integration.enabled}
          disabled={busy}
          onChange={() => void toggleEnabled(!integration.enabled)}
        />
      </div>

      {integration.enabled ? (
        <div className="space-y-2 border-t border-[#f0f0f0] px-3 py-3">
          {statusLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="size-4 animate-spin text-[#c0c0c0]" />
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                Library folders
              </p>
              {folders.length === 0 ? (
                <p className="text-[12px] text-[#717171]">No folders reported yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {folders.map((folder) => (
                    <li
                      key={folder.libraryId}
                      className="flex items-start gap-2 rounded-lg bg-[#f7f7f7] px-2.5 py-2 text-[11px]"
                      style={{ border: "1px solid #ececec" }}
                    >
                      {folder.ready ? (
                        <Check className="mt-0.5 size-3.5 shrink-0 text-[#22c55e]" />
                      ) : (
                        <Plug className="mt-0.5 size-3.5 shrink-0 text-[#a0a0a0]" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-[#222222]">{folder.libraryName}</p>
                        <p className="truncate font-mono text-[#717171]">{folder.folderPath}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!allReady && folders.length > 0 ? (
                <p className="text-[11px] text-[#92400e]">
                  Some folders are missing — run repair below.
                </p>
              ) : null}
              {status?.mirrorRootHint ? (
                <p className="text-[11px] text-[#a0a0a0]">{status.mirrorRootHint}</p>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void repairFolders()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] text-[12px] font-semibold text-[#222222] disabled:opacity-50"
              >
                <Wrench className="size-3.5" />
                Repair folders
              </button>
            </>
          )}
        </div>
      ) : null}

      {message ? (
        <div className="mx-3 mb-3">
          <PanelStatusBanner message={message} />
        </div>
      ) : null}
      {error ? (
        <p className="mx-3 mb-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-2.5 py-2 text-[11px] text-[#b91c1c]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function IntegrationsForm({
  integrations,
  loading,
  error,
  showingCachedOffline,
  isRevalidating,
  connection,
  reload,
}: {
  integrations: IntegrationSummary[] | null
  loading: boolean
  error: string | null
  showingCachedOffline: boolean
  isRevalidating: boolean
  connection: Parameters<typeof listIntegrations>[0]
  reload: () => void
}) {
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

  const mediaConnectors = integrations.filter(
    (i) => isPlexIntegration(i) || isJellyfinIntegration(i),
  )
  const other = integrations.filter(
    (i) => !isPlexIntegration(i) && !isJellyfinIntegration(i),
  )

  return (
    <div className="flex flex-col gap-4">
      {showingCachedOffline ? <OfflineCachedNotice revalidating={isRevalidating} /> : null}
      <SettingsIntroCard
        icon={PackagePlus}
        title="Integrations"
        description="Enable Plex or Jellyfin connectors and repair library folders — same controls as desktop Settings → Integrations."
      />

      {mediaConnectors.length === 0 ? (
        <p className="text-[12px] text-[#717171]">
          No Plex or Jellyfin connectors on this instance yet. Open Arciin on desktop once to
          register them, then return here.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {mediaConnectors.map((integration) => (
            <MediaConnectorCard
              key={integration.id}
              integration={integration}
              kind={isPlexIntegration(integration) ? "plex" : "jellyfin"}
              connection={connection}
              onChanged={() => void reload()}
            />
          ))}
        </div>
      )}

      {other.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Other integrations
          </p>
          {other.map((integration) => (
            <div
              key={integration.id}
              className="rounded-xl bg-[#f7f7f7] px-3 py-3"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <p className="text-[13px] font-semibold text-[#222222]">{integration.name}</p>
              <p className="mt-0.5 text-[11px] text-[#717171]">
                {integration.enabled ? "Enabled" : "Disabled"} · configure on desktop
              </p>
            </div>
          ))}
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
    connection,
    reload,
  } = useStablePanelLoad(enabled, load, {
    cacheKey: "integrations",
  })

  if (!enabled || !connection) return null

  return (
    <AdminSettingsGate feature="Integrations">
      <IntegrationsForm
        integrations={integrations}
        loading={loading}
        error={error}
        showingCachedOffline={showingCachedOffline}
        isRevalidating={isRevalidating}
        connection={connection}
        reload={reload}
      />
    </AdminSettingsGate>
  )
}
