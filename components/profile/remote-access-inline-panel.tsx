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

import { formatApiError } from "@/lib/api/errors"
import { getRemoteAccessSettings, updateRemoteAccessSettings } from "@/lib/api/settings"
import { useConnection } from "@/components/providers/connection-provider"
import { dispatchAppForeground } from "@/lib/hooks/use-app-foreground"
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

  const { data, loading, error, reload } = useStablePanelLoad(
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
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setDomain(data.publicUrl ?? "")
    setInitialDomain(data.publicUrl ?? "")
    setLocalUrl(data.primaryLanUrl ?? data.localUrl ?? data.requestOrigin ?? null)
    setLanUrls(data.lanUrls?.length ? data.lanUrls : [])
    setConnectionMode(readStoredMode())
  }, [data])

  useEffect(() => {
    if (!enabled || !connection) return
    let cancelled = false
    setResolving(true)
    void (async () => {
      const ok = await tryAutoReconnect()
      if (!cancelled) {
        setResolving(false)
        if (ok) {
          setMessage("Connected — address updated if the server tunnel changed.")
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

  const activePublicUrl = (data?.publicUrl || domain || "").trim()
  const activeLocalUrl = (localUrl || data?.localUrl || "").trim()
  const usingPublic = connectionMode === "public" && Boolean(activePublicUrl)
  const lanList = lanUrls.length > 0 ? lanUrls : activeLocalUrl ? [activeLocalUrl] : []

  async function savePatch(patch: Partial<RemoteAccessSettings>) {
    if (!connection) return
    setSaving(true)
    setSaveError(null)
    setMessage(null)
    try {
      const updated = await updateRemoteAccessSettings(connection, patch)
      setDomain(updated.publicUrl ?? "")
      setInitialDomain(updated.publicUrl ?? "")
      setLocalUrl(updated.primaryLanUrl ?? updated.localUrl ?? updated.requestOrigin ?? null)
      setLanUrls(updated.lanUrls ?? [])
      setMessage("Saved on server.")
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
    setMessage(null)
    try {
      const result = await reconnectServer(address)
      if (result.status === "connected") {
        setMessage("Connected.")
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
        <Globe className="mt-0.5 size-4 shrink-0 text-[#ff4f12]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">Remote access</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#717171]">
            Still the right place to switch LAN vs public. After pairing, Arciin can update the address
            when the tunnel changes (same Wi‑Fi, or while this app is open).
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
        <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5">
          <p className="text-[12px] text-[#92400e]">Can’t reach the saved URL.</p>
          <button
            type="button"
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#ff4f12] text-[12px] font-semibold text-white"
            onClick={() => void tryAutoReconnect().then((ok) => ok && setMessage("Reconnected."))}
          >
            <RefreshCw className="size-3.5" />
            Try again
          </button>
        </div>
      ) : null}

      {loading && connection ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
        </div>
      ) : null}

      {error && !loading ? (
        <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">{error}</p>
      ) : null}

      {!loading && data ? (
        <>
          <ModeCard
            active={!usingPublic}
            icon={Wifi}
            title="On your network"
            subtitle="Same Wi‑Fi as the server"
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

          <ModeCard
            active={usingPublic}
            icon={Smartphone}
            title="From anywhere"
            subtitle="Public HTTPS"
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
                  onClick={() => void savePatch({ publicUrl: domain.trim() || null })}
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
        </>
      ) : null}

      {saveError ? (
        <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">{saveError}</p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[12px] text-[#15803d]">{message}</p>
      ) : null}
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
      style={{ border: `1px solid ${active ? "rgba(255,79,18,0.4)" : "#e5e5e5"}` }}
    >
      <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-3.5 py-2.5">
        <Icon className="size-4 text-[#717171]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">{title}</p>
          <p className="text-[10px] text-[#a0a0a0]">{subtitle}</p>
        </div>
        {active ? (
          <span className="rounded-full bg-[#fff7f4] px-2 py-0.5 text-[10px] font-semibold text-[#ff4f12]">
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
