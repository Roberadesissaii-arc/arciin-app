"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftRight,
  Cloud,
  Copy,
  Globe,
  Link2,
  Loader2,
  Save,
  Smartphone,
  Wifi,
} from "lucide-react"

import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { formatApiError } from "@/lib/api/errors"
import {
  getRemoteAccessSettings,
  startCloudflareTunnelForMobile,
  updateRemoteAccessSettings,
} from "@/lib/api/settings"
import {
  deriveMobileServerUrlsFromApiBase,
  normalizeApiBase,
} from "@/lib/connection/normalize-url"
import { serverAddressFromProfile } from "@/lib/connection/reconnect-server"
import { loadServerProfile, saveServerProfile } from "@/lib/connection/storage"
import { useConnection } from "@/components/providers/connection-provider"
import { dispatchAppForeground } from "@/lib/hooks/use-app-foreground"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { RemoteAccessSettings } from "@/lib/types/models"

type ConnectionMode = "local" | "public"

function readStoredMode(): ConnectionMode {
  if (typeof window === "undefined") return "local"
  const stored = localStorage.getItem("arciin_mobile_connection_mode_v1")
  return stored === "public" ? "public" : "local"
}

function writeStoredMode(mode: ConnectionMode) {
  if (typeof window === "undefined") return
  localStorage.setItem("arciin_mobile_connection_mode_v1", mode)
}

function applyServerProfileFromWebUrl(webUrl: string, instanceName?: string) {
  const apiBase = normalizeApiBase(`${webUrl.replace(/\/+$/, "")}/api`)
  const urls = deriveMobileServerUrlsFromApiBase(apiBase)
  saveServerProfile({
    ...urls,
    instanceName: instanceName ?? loadServerProfile()?.instanceName ?? "Arciin",
  })
}

export function RemoteAccessInlinePanel({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const { connection, reconnectServer, serverReachable, refresh } = useConnection()

  const load = useCallback(
    (conn: Parameters<typeof getRemoteAccessSettings>[0], signal: AbortSignal) =>
      getRemoteAccessSettings(conn, signal),
    [],
  )

  const { data, loading, error, reload } = useStablePanelLoad(enabled && Boolean(connection), load)

  const [serverAddress, setServerAddress] = useState("")
  const [reconnecting, setReconnecting] = useState(false)
  const [reconnectMessage, setReconnectMessage] = useState<string | null>(null)
  const [reconnectError, setReconnectError] = useState<string | null>(null)

  const [domain, setDomain] = useState("")
  const [initialDomain, setInitialDomain] = useState("")
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [loopbackUrl, setLoopbackUrl] = useState<string | null>(null)
  const [lanUrls, setLanUrls] = useState<string[]>([])
  const [mobilePublicUrl, setMobilePublicUrl] = useState<string | null>(null)
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("local")
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    setServerAddress(serverAddressFromProfile())
  }, [enabled])

  useEffect(() => {
    if (!data) return
    const pub = data.publicUrl ?? ""
    setDomain(pub)
    setInitialDomain(pub)
    setLocalUrl(data.primaryLanUrl ?? data.localUrl ?? data.requestOrigin ?? null)
    setLoopbackUrl(data.loopbackUrl ?? null)
    setLanUrls(data.lanUrls?.length ? data.lanUrls : [])
    setMobilePublicUrl(data.mobilePublicUrl ?? null)
    setConnectionMode(readStoredMode())
  }, [data])

  const showReconnect = serverReachable === false
  const activePublicUrl = (mobilePublicUrl || data?.publicUrl || domain || "").trim()
  const activeLocalUrl = (localUrl || data?.localUrl || "").trim()
  const usingPublic = connectionMode === "public" && Boolean(activePublicUrl)
  const lanList =
    lanUrls.length > 0 ? lanUrls : activeLocalUrl ? [activeLocalUrl] : []

  async function handleReconnect() {
    setReconnecting(true)
    setReconnectError(null)
    setReconnectMessage(null)
    try {
      const result = await reconnectServer(serverAddress)
      if (result.status === "connected") {
        setReconnectMessage("Reconnected. Your session is still active — no pairing code needed.")
        dispatchAppForeground()
        await refresh()
        await reload()
        return
      }
      if (result.status === "need_sign_in") {
        setReconnectMessage("Server address updated. Sign in with your email and password (same account).")
        router.push("/sign-in")
        return
      }
      setReconnectError(result.message)
    } catch (err) {
      setReconnectError(formatApiError(err, serverAddress))
    } finally {
      setReconnecting(false)
    }
  }

  async function savePatch(patch: Partial<RemoteAccessSettings>) {
    if (!connection) return
    setSaving(true)
    setSaveError(null)
    setMessage(null)
    try {
      const updated = await updateRemoteAccessSettings(connection, patch)
      const pub = updated.publicUrl ?? ""
      setDomain(pub)
      setInitialDomain(pub)
      setLocalUrl(updated.primaryLanUrl ?? updated.localUrl ?? updated.requestOrigin ?? null)
      setLoopbackUrl(updated.loopbackUrl ?? null)
      setLanUrls(updated.lanUrls ?? [])
      setMobilePublicUrl(updated.mobilePublicUrl ?? null)
      setMessage("Remote access updated.")
      await reload()
    } catch (err) {
      setSaveError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function switchToLocal() {
    const target = activeLocalUrl || lanList[0]
    if (!target) {
      setSaveError("No local network URL from the server yet.")
      return
    }
    setServerAddress(target)
    writeStoredMode("local")
    setConnectionMode("local")
    await handleReconnectWithAddress(target)
  }

  async function switchToPublic() {
    const target = activePublicUrl || domain.trim()
    if (!target) {
      setSaveError("Set or generate a public URL first.")
      return
    }
    setServerAddress(target)
    writeStoredMode("public")
    setConnectionMode("public")
    await handleReconnectWithAddress(target)
  }

  async function handleReconnectWithAddress(address: string) {
    setReconnecting(true)
    setSaveError(null)
    setMessage(null)
    try {
      const result = await reconnectServer(address)
      if (result.status === "connected") {
        setMessage("Connected on the new address. No pairing code needed.")
        dispatchAppForeground()
        await refresh()
        await reload()
        return
      }
      if (result.status === "need_sign_in") {
        setMessage("Address updated. Sign in with your password.")
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

  async function generateMobilePublicUrl() {
    if (!connection) {
      setSaveError("Connect to the server on your network first, or update the server address below.")
      return
    }
    setGenerating(true)
    setSaveError(null)
    setMessage(null)
    try {
      const result = await startCloudflareTunnelForMobile(connection)
      const url = (result.mobilePublicUrl ?? result.publicUrl ?? result.url ?? "").trim()
      if (!url) {
        setSaveError("Tunnel started but no URL was returned.")
        return
      }
      if (!url.startsWith("https://")) {
        setSaveError("Invalid tunnel URL from server. Generate again from desktop Settings → Domain.")
        return
      }
      applyServerProfileFromWebUrl(url, connection.instanceName)
      setMobilePublicUrl(url)
      setDomain(url)
      setInitialDomain(url)
      setServerAddress(url)
      writeStoredMode("public")
      setConnectionMode("public")
      await handleReconnectWithAddress(url)
    } catch (err) {
      setSaveError(formatApiError(err))
    } finally {
      setGenerating(false)
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setMessage("Copied to clipboard.")
    } catch {
      setSaveError("Could not copy to clipboard.")
    }
  }

  if (!enabled) return null

  return (
    <div className="flex flex-col gap-4">
      <SettingsIntroCard
        icon={Globe}
        title="Remote access"
        description="Update where this app connects. When a tunnel expires, paste the new URL here — you keep your account; only re-pair if sign-in asks."
      />

      <section
        className="overflow-hidden rounded-2xl bg-white"
        style={{ border: "1px solid rgba(255,79,18,0.35)" }}
      >
        <div className="flex items-center gap-2 border-b border-[#f0f0f0] bg-[#fff7f4] px-4 py-3">
          <Link2 className="size-4 text-[#ff4f12]" />
          <div>
            <p className="text-[13px] font-semibold text-[#222222]">Server address</p>
            <p className="text-[11px] text-[#a0a0a0]">
              {showReconnect
                ? "Tunnel expired or server offline? Paste the new URL and reconnect."
                : "Change where this app connects without registering again."}
            </p>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          <input
            type="url"
            value={serverAddress}
            onChange={(e) => setServerAddress(e.target.value)}
            placeholder="https://xxxx.trycloudflare.com or http://192.168.1.10:3004"
            className="w-full rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[13px] text-[#222222] outline-none"
            style={{ border: "1px solid #e5e5e5" }}
            autoComplete="url"
          />
          <button
            type="button"
            disabled={reconnecting || !serverAddress.trim()}
            onClick={() => void handleReconnect()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff4f12] text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {reconnecting ? <Loader2 className="size-4 animate-spin" /> : null}
            {reconnecting ? "Reconnecting…" : "Update address & reconnect"}
          </button>
          {reconnectError ? (
            <p className="text-[12px] text-[#b91c1c]">{reconnectError}</p>
          ) : null}
          {reconnectMessage ? (
            <p className="text-[12px] text-[#15803d]">{reconnectMessage}</p>
          ) : null}
        </div>
      </section>

      {loading && connection ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
        </div>
      ) : null}

      <section
        className="overflow-hidden rounded-2xl bg-white"
        style={{ border: `1px solid ${usingPublic ? "#e5e5e5" : "rgba(255,79,18,0.35)"}` }}
      >
        <div className="flex items-center gap-2 border-b border-[#f0f0f0] bg-[#fafafa] px-4 py-3">
          <Wifi className="size-4 text-[#717171]" />
          <div>
            <p className="text-[13px] font-semibold text-[#222222]">On your network</p>
            <p className="text-[11px] text-[#a0a0a0]">Same Wi‑Fi as your Arciin server</p>
          </div>
          {!usingPublic ? (
            <span className="ml-auto rounded-full bg-[#fff7f4] px-2 py-0.5 text-[10px] font-semibold text-[#ff4f12]">
              Active
            </span>
          ) : null}
        </div>
        <div className="space-y-3 px-4 py-4">
          {loopbackUrl ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">This machine</p>
              <p className="mt-1 break-all font-mono text-[12px] text-[#222222]">{loopbackUrl}</p>
            </div>
          ) : null}
          {lanList.map((url, i) => (
            <div key={url}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                LAN{lanList.length > 1 ? ` ${i + 1}` : ""}
              </p>
              <p className="mt-1 break-all font-mono text-[12px] text-[#222222]">{url}</p>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={reconnecting || lanList.length === 0}
              onClick={() => void switchToLocal()}
              className="flex h-10 flex-1 min-w-[8rem] items-center justify-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] text-[13px] font-semibold text-[#222222] disabled:opacity-50"
            >
              <ArrowLeftRight className="size-4" />
              Use local
            </button>
          </div>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-2xl bg-white"
        style={{ border: `1px solid ${usingPublic ? "rgba(255,79,18,0.35)" : "#e5e5e5"}` }}
      >
        <div className="flex items-center gap-2 border-b border-[#f0f0f0] bg-[#fafafa] px-4 py-3">
          <Smartphone className="size-4 text-[#717171]" />
          <div>
            <p className="text-[13px] font-semibold text-[#222222]">From anywhere</p>
            <p className="text-[11px] text-[#a0a0a0]">Public HTTPS URL</p>
          </div>
          {usingPublic ? (
            <span className="ml-auto rounded-full bg-[#fff7f4] px-2 py-0.5 text-[10px] font-semibold text-[#ff4f12]">
              Active
            </span>
          ) : null}
        </div>
        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="remote-domain" className="text-[12px] font-semibold text-[#717171]">
              Instance public URL
            </label>
            <input
              id="remote-domain"
              type="url"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="https://xxxx.trycloudflare.com"
              className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[13px] text-[#222222] outline-none focus:bg-white"
              style={{ border: "1px solid #e5e5e5" }}
            />
          </div>
          {mobilePublicUrl ? (
            <div className="rounded-xl bg-[#f7f7f7] px-3 py-2.5" style={{ border: "1px solid #e5e5e5" }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">Phone tunnel URL</p>
              <p className="mt-1 break-all font-mono text-[12px] text-[#222222]">{mobilePublicUrl}</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={saving || reconnecting || domain.trim() === initialDomain.trim() || !connection}
              onClick={() => void savePatch({ publicUrl: domain.trim() || null })}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#ff4f12] text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <Save className="size-4 shrink-0" />
              )}
              Save on server
            </button>
            <button
              type="button"
              disabled={reconnecting || (!activePublicUrl && !domain.trim())}
              onClick={() => void switchToPublic()}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] text-[13px] font-semibold text-[#222222] disabled:opacity-50"
            >
              <ArrowLeftRight className="size-4 shrink-0" />
              Switch to public URL
            </button>
            <button
              type="button"
              disabled={generating || saving || reconnecting || !connection}
              onClick={() => void generateMobilePublicUrl()}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#ff4f12]/40 bg-[#fff7f4] px-3 py-2.5 text-[13px] font-semibold text-[#ff4f12] disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                <Cloud className="size-4 shrink-0" />
              )}
              <span className="text-center leading-tight">
                {generating ? "Starting tunnel…" : "Generate public URL"}
              </span>
            </button>
            <p className="text-center text-[11px] text-[#a0a0a0]">
              Same as desktop Settings → Domain. Your Arciin server must be online.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-[#fafafa] px-4 py-3" style={{ border: "1px solid #e5e5e5" }}>
        <p className="text-[11px] leading-relaxed text-[#717171]">
          Quick tunnels expire after a few hours. When you get Cloudflare 530, paste the new URL in Server address
          above and tap Update — you stay signed in. For a URL that lasts until reboot, keep cloudflared running on
          the server (PM2).
        </p>
      </section>

      {saveError ? (
        <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">{saveError}</p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[12px] text-[#15803d]">{message}</p>
      ) : null}
    </div>
  )
}
