"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftRight,
  Globe,
  Loader2,
  RefreshCw,
  Smartphone,
  Wifi,
} from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { formatApiError } from "@/lib/api/errors"
import { HOSTED_APP_REMOTE_INTRO, isPwaHostedApp } from "@/lib/api/hosted-app"
import {
  getCloudflareTunnelStatus,
  getRemoteAccessSettings,
  startCloudflareTunnelMobile,
  stopCloudflareTunnel,
  updateRemoteAccessSettings,
  type CloudflareTunnelStatus,
} from "@/lib/api/settings"
import {
  mobileAppWebOrigin,
  mobileLanUrls,
  mobileRemotePublicUrl,
} from "@/lib/connection/mobile-access-urls"
import { useConnection } from "@/components/providers/connection-provider"
import { loadServerProfile } from "@/lib/connection/storage"
import { dispatchAppForeground } from "@/lib/hooks/use-app-foreground"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { RemoteAccessSettings } from "@/lib/types/models"

type ConnectionMode = "local" | "public"

function readStoredMode(): ConnectionMode {
  if (typeof window === "undefined") return "local"
  return localStorage.getItem("arciin_mobile_connection_mode_v1") === "public" ? "public" : "local"
}

function writeStoredMode(mode: ConnectionMode) {
  if (typeof window === "undefined") return
  localStorage.setItem("arciin_mobile_connection_mode_v1", mode)
}

export function RemoteAccessInlinePanel({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const { connection, reconnectServer, serverReachable, refresh, tryAutoReconnect } = useConnection()

  const load = useCallback(
    (conn: Parameters<typeof getRemoteAccessSettings>[0], signal: AbortSignal) =>
      getRemoteAccessSettings(conn, signal),
    [],
  )

  const { data, loading, error, showingCachedOffline, isRevalidating, reload } = useStablePanelLoad(
    enabled && Boolean(connection),
    load,
    { cacheKey: "remote-access" },
  )

  const [domain, setDomain] = useState("")
  const [initialDomain, setInitialDomain] = useState("")
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [lanUrls, setLanUrls] = useState<string[]>([])
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("local")
  const [reconnecting, setReconnecting] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage(enabled)
  const [manualAddress, setManualAddress] = useState("")
  const [tunnel, setTunnel] = useState<CloudflareTunnelStatus | null>(null)
  const [tunnelBusy, setTunnelBusy] = useState(false)

  useEffect(() => {
    if (!data) return
    const publicForMobile = mobileRemotePublicUrl(data)
    setDomain(publicForMobile)
    setInitialDomain(publicForMobile)
    const mobileLan = mobileLanUrls(data)
    setLocalUrl(mobileLan[0] ?? data.requestOrigin ?? null)
    setLanUrls(mobileLan)
    setConnectionMode(readStoredMode())
  }, [data])

  useEffect(() => {
    if (!enabled) return
    const profile = loadServerProfile()
    const saved =
      profile?.canonicalPublicUrl ??
      profile?.webUrl ??
      profile?.apiBaseUrl?.replace(/\/api\/?$/i, "") ??
      ""
    if (saved) {
      setManualAddress((prev) => prev || saved)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || !connection) return
    let cancelled = false
    setResolving(true)
    void (async () => {
      const ok = await tryAutoReconnect()
      if (!cancelled) {
        setResolving(false)
        if (ok) {
          showStatus("Connected — address updated if the server tunnel changed.")
          setSaveError(null)
          await reload()
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when opening Remote access
  }, [enabled, connection?.sessionToken])

  useEffect(() => {
    if (!enabled || !connection) return
    let cancelled = false
    void (async () => {
      try {
        const status = await getCloudflareTunnelStatus(connection)
        if (!cancelled) setTunnel(status)
      } catch {
        if (!cancelled) setTunnel(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, connection, data?.publicUrl])

  async function handleTunnelStart() {
    if (!connection) return
    setTunnelBusy(true)
    setSaveError(null)
    try {
      if (tunnel?.running) {
        await stopCloudflareTunnel(connection)
      }
      const status = await startCloudflareTunnelMobile(connection)
      setTunnel(status)
      const tunnelUrl = status.mobilePublicUrl ?? status.url
      if (tunnelUrl) {
        setDomain(tunnelUrl)
        showStatus("Tunnel started — mobile public URL updated.")
        await reload()
      }
    } catch (err) {
      setSaveError(formatApiError(err))
    } finally {
      setTunnelBusy(false)
    }
  }

  async function handleTunnelStop() {
    if (!connection) return
    setTunnelBusy(true)
    setSaveError(null)
    try {
      const status = await stopCloudflareTunnel(connection)
      setTunnel(status)
      showStatus("Tunnel stopped.")
    } catch (err) {
      setSaveError(formatApiError(err))
    } finally {
      setTunnelBusy(false)
    }
  }

  const activePublicUrl = (domain || (data ? mobileRemotePublicUrl(data) : "") || "").trim()
  const activeLocalUrl =
    (localUrl || mobileLanUrls(data ?? {})[0] || mobileAppWebOrigin() || "").trim()
  const usingPublic = connectionMode === "public" && Boolean(activePublicUrl)
  const lanList =
    lanUrls.length > 0
      ? lanUrls
      : activeLocalUrl
        ? [activeLocalUrl]
        : mobileAppWebOrigin()
          ? [mobileAppWebOrigin()]
          : []

  async function savePatch(patch: Partial<RemoteAccessSettings>) {
    if (!connection) return
    setSaving(true)
    setSaveError(null)
    clearStatus()
    try {
      const updated = await updateRemoteAccessSettings(connection, patch)
      const publicForMobile = mobileRemotePublicUrl(updated)
      setDomain(publicForMobile)
      setInitialDomain(publicForMobile)
      const mobileLan = mobileLanUrls(updated)
      setLocalUrl(mobileLan[0] ?? updated.requestOrigin ?? null)
      setLanUrls(mobileLan)
      showStatus("Saved on server.")
      await reload()
    } catch (err) {
      setSaveError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleReconnectWithAddress(address: string) {
    setReconnecting(true)
    setSaveError(null)
    clearStatus()
    try {
      const result = await reconnectServer(address)
      if (result.status === "connected") {
        showStatus("Connected.")
        dispatchAppForeground()
        await refresh()
        await reload()
        return
      }
      if (result.status === "need_sign_in") {
        router.push("/sign-in")
        return
      }
      setSaveError(result.message)
    } catch (err) {
      setSaveError(formatApiError(err, address))
    } finally {
      setReconnecting(false)
    }
  }

  if (!enabled) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3.5 py-3">
        <Globe className="text-accent mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">Remote access</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#717171]">
            {isPwaHostedApp()
              ? HOSTED_APP_REMOTE_INTRO
              : "Switch LAN vs public. Arciin can update the address when the tunnel changes."}
          </p>
        </div>
      </div>

      {(resolving || reconnecting) && (
        <p className="flex items-center gap-2 text-[12px] text-[#717171]">
          <Loader2 className="size-3.5 animate-spin" />
          Finding your server…
        </p>
      )}

      {serverReachable === false && !resolving ? (
        <div className="space-y-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-3">
          <p className="text-[12px] leading-relaxed text-[#92400e]">
            Can’t reach the saved URL.
            {isPwaHostedApp()
              ? " Paste your public HTTPS address below."
              : " Try again on Wi‑Fi or paste your public URL below."}
          </p>
          <input
            type="url"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="https://….trycloudflare.com"
            className="w-full rounded-lg bg-white px-3 py-2.5 font-mono text-[12px] text-[#222222] outline-none"
            style={{ border: "1px solid #e5e5e5" }}
          />
          <button
            type="button"
            disabled={reconnecting || !manualAddress.trim()}
            className="btn-accent-solid flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[12px] font-semibold disabled:opacity-50"
            onClick={() => void handleReconnectWithAddress(manualAddress.trim())}
          >
            <ArrowLeftRight className="size-3.5" />
            Connect with this address
          </button>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#fcd34d] bg-white text-[12px] font-semibold text-[#92400e]"
            onClick={() => void tryAutoReconnect().then((ok) => ok && showStatus("Reconnected."))}
          >
            <RefreshCw className="size-3.5" />
            Try auto-reconnect
          </button>
        </div>
      ) : null}

      <AdminSettingsGate feature="Remote access settings">
        <>
          {loading && connection ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
            </div>
          ) : null}

          {error && !loading && !data ? (
            <MutedPanelError error={error} onRetry={() => void reload()} />
          ) : null}

          {showingCachedOffline && (data || !loading) ? (
            <OfflineCachedNotice revalidating={isRevalidating} />
          ) : null}

          {!loading && data ? (
            <>
              {!isPwaHostedApp() ? (
                <ModeCard
                  active={!usingPublic}
                  icon={Wifi}
                  title="On your network"
                  subtitle="Arciin Mobile on same Wi‑Fi"
                  urls={lanList}
                  actionLabel="Use LAN"
                  actionDisabled={reconnecting || lanList.length === 0}
                  onAction={() => {
                    writeStoredMode("local")
                    setConnectionMode("local")
                    const target = lanList[0]
                    if (target) void handleReconnectWithAddress(target)
                  }}
                />
              ) : null}

              <ModeCard
                active={usingPublic}
                icon={Smartphone}
                title="From anywhere"
                subtitle="Public HTTPS for Arciin Mobile"
                urls={activePublicUrl ? [activePublicUrl] : []}
                actionLabel="Use public URL"
                actionDisabled={reconnecting || !activePublicUrl}
                onAction={() => {
                  writeStoredMode("public")
                  setConnectionMode("public")
                  void handleReconnectWithAddress(activePublicUrl)
                }}
                footer={
                  <div className="space-y-2 border-t border-[#f0f0f0] pt-3">
                    <input
                      type="url"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="https://….trycloudflare.com"
                      className="w-full rounded-lg bg-[#f7f7f7] px-3 py-2.5 font-mono text-[12px] text-[#222222] outline-none"
                      style={{ border: "1px solid #e5e5e5" }}
                    />
                    <button
                      type="button"
                      disabled={saving || !connection || domain.trim() === initialDomain.trim()}
                      onClick={() =>
                        void savePatch({ mobilePublicUrl: domain.trim() || null })
                      }
                      className="h-9 w-full rounded-lg border border-[#e5e5e5] text-[12px] font-semibold text-[#222222] disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save on server"}
                    </button>
                    <p className="text-center text-[10px] text-[#a0a0a0]">
                      Or set URL on desktop → Settings → Domain
                    </p>
                  </div>
                }
              />
              {!isPwaHostedApp() ? (
                <section
                  className="overflow-hidden rounded-2xl bg-white"
                  style={{ border: "1px solid #e5e5e5" }}
                >
                  <div className="border-b border-[#f0f0f0] px-3.5 py-2.5">
                    <p className="text-[13px] font-semibold text-[#222222]">Cloudflare tunnel</p>
                    <p className="text-[10px] text-[#a0a0a0]">
                      Tunnels to this phone app (not desktop web on :3002)
                    </p>
                  </div>
                  <div className="space-y-2.5 px-3.5 py-3">
                    <p className="text-[12px] text-[#717171]">
                      {tunnel?.running
                        ? `Running${tunnel.url ? ` · ${tunnel.url}` : ""}`
                        : "Stopped — start to get a public URL for this phone."}
                    </p>
                    {tunnel?.error ? (
                      <p className="text-[11px] text-[#b91c1c]">{tunnel.error}</p>
                    ) : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={tunnelBusy || tunnel?.running}
                        onClick={() => void handleTunnelStart()}
                        className="btn-accent-solid flex h-10 flex-1 items-center justify-center rounded-xl text-[12px] font-semibold disabled:opacity-50"
                      >
                        Start tunnel
                      </button>
                      <button
                        type="button"
                        disabled={tunnelBusy || !tunnel?.running}
                        onClick={() => void handleTunnelStop()}
                        className="flex h-10 flex-1 items-center justify-center rounded-xl border border-[#e5e5e5] text-[12px] font-semibold text-[#222222] disabled:opacity-50"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </>
      </AdminSettingsGate>

      {saveError ? <MutedPanelError error={saveError} /> : null}
      <PanelStatusBanner message={message} />
    </div>
  )
}

function ModeCard({
  active,
  icon: Icon,
  title,
  subtitle,
  urls,
  actionLabel,
  actionDisabled,
  onAction,
  footer,
}: {
  active: boolean
  icon: typeof Wifi
  title: string
  subtitle: string
  urls: string[]
  actionLabel: string
  actionDisabled: boolean
  onAction: () => void
  footer?: React.ReactNode
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl bg-white"
      style={{ border: `1px solid ${active ? "var(--arciin-accent-ring)" : "#e5e5e5"}` }}
    >
      <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-3.5 py-2.5">
        <Icon className="size-4 text-[#717171]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">{title}</p>
          <p className="text-[10px] text-[#a0a0a0]">{subtitle}</p>
        </div>
        {active ? (
          <span className="accent-badge-pill rounded-full px-2 py-0.5 text-[10px] font-semibold">
            Active
          </span>
        ) : null}
      </div>
      <div className="space-y-2.5 px-3.5 py-3">
        {urls.length > 0 ? (
          urls.map((url) => (
            <p key={url} className="break-all font-mono text-[11px] text-[#444444]">
              {url}
            </p>
          ))
        ) : (
          <p className="text-[11px] text-[#a0a0a0]">No URL from server yet.</p>
        )}
        <button
          type="button"
          disabled={actionDisabled}
          onClick={onAction}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] text-[13px] font-semibold text-[#222222] disabled:opacity-50"
        >
          <ArrowLeftRight className="size-4" />
          {actionLabel}
        </button>
        {footer}
      </div>
    </section>
  )
}
