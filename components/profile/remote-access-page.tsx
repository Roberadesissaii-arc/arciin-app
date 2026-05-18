"use client"

import { useEffect, useState } from "react"
import { Globe, Loader2, Lock, Save, Server, Terminal } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { getRemoteAccessSettings, updateRemoteAccessSettings } from "@/lib/api/settings"

export function RemoteAccessPage() {
  const { connection, ready } = useConnection()
  const [domain, setDomain] = useState("")
  const [initialDomain, setInitialDomain] = useState("")
  const [tunnel, setTunnel] = useState(false)
  const [reverseProxy, setReverseProxy] = useState(false)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !connection) return
    let cancelled = false
    const ac = new AbortController()

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getRemoteAccessSettings(connection, ac.signal)
        if (cancelled) return
        const pub = data.publicUrl ?? ""
        setDomain(pub)
        setInitialDomain(pub)
        setTunnel(data.cloudflareTunnelEnabled)
        setReverseProxy(data.reverseProxyEnabled)
        setLocalUrl(data.localUrl ?? null)
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

  async function savePatch(patch: Parameters<typeof updateRemoteAccessSettings>[1]) {
    if (!connection) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const data = await updateRemoteAccessSettings(connection, patch)
      const pub = data.publicUrl ?? ""
      setDomain(pub)
      setInitialDomain(pub)
      setTunnel(data.cloudflareTunnelEnabled)
      setReverseProxy(data.reverseProxyEnabled)
      setLocalUrl(data.localUrl ?? null)
      setMessage("Remote access updated.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (!ready || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#a0a0a0]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl bg-white p-4" style={{ border: "1px solid #e5e5e5" }}>
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(255,79,18,0.08)", border: "1px solid rgba(255,79,18,0.2)" }}
          >
            <Globe className="size-[15px]" style={{ color: "#ff4f12" }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#222222]">About remote access</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#717171]">
              Arciin runs on your local server first. Add a custom domain or tunnel only when you
              want to access it from outside your network.
            </p>
          </div>
        </div>
      </div>

      {localUrl ? (
        <div
          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <Server className="size-4 shrink-0 text-[#717171]" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[#a0a0a0]">Local URL</p>
            <p className="truncate font-mono text-[12px] text-[#222222]">{localUrl}</p>
          </div>
        </div>
      ) : null}

      <div
        className="flex flex-col gap-4 rounded-2xl bg-white p-5"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
          Public URL
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="domain" className="text-[12px] font-semibold text-[#717171]">
            Domain or HTTPS origin
          </label>
          <input
            id="domain"
            type="url"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="https://arciin.yourdomain.com"
            className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[13px] text-[#222222] outline-none placeholder-[#c0c0c0] focus:bg-white"
            style={{ border: "1px solid #e5e5e5" }}
          />
        </div>
        <button
          type="button"
          disabled={saving || domain.trim() === initialDomain.trim()}
          onClick={() =>
            void savePatch({ publicUrl: domain.trim() || null })
          }
          className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-semibold text-white disabled:opacity-40 active:opacity-80"
          style={{ backgroundColor: "#ff4f12" }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save URL
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: "#f7f7f7", border: "1px solid #e5e5e5" }}
            >
              <Terminal className="size-[15px] text-[#717171]" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#222222]">Cloudflare tunnel</p>
              <p className="text-[11px] text-[#a0a0a0]">Expose instance via tunnel</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={tunnel}
            disabled={saving}
            onClick={() => void savePatch({ cloudflareTunnelEnabled: !tunnel })}
            className="relative shrink-0 transition-colors disabled:opacity-50"
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: tunnel ? "#ff4f12" : "#e5e5e5",
            }}
          >
            <span
              className="absolute top-[3px] size-5 rounded-full bg-white shadow-sm transition-transform"
              style={{ left: 3, transform: tunnel ? "translateX(18px)" : "translateX(0)" }}
            />
          </button>
        </div>
        <div className="mx-4 h-px bg-[#f0f0f0]" />
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <p className="text-[14px] font-medium text-[#222222]">Reverse proxy</p>
            <p className="text-[11px] text-[#a0a0a0]">nginx, Caddy, or similar</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reverseProxy}
            disabled={saving}
            onClick={() => void savePatch({ reverseProxyEnabled: !reverseProxy })}
            className="relative shrink-0 transition-colors disabled:opacity-50"
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: reverseProxy ? "#ff4f12" : "#e5e5e5",
            }}
          >
            <span
              className="absolute top-[3px] size-5 rounded-full bg-white shadow-sm transition-transform"
              style={{ left: 3, transform: reverseProxy ? "translateX(18px)" : "translateX(0)" }}
            />
          </button>
        </div>
        <div className="mx-4 h-px bg-[#f0f0f0]" />
        <div className="flex items-start gap-3 px-4 py-3.5">
          <Lock className="mt-0.5 size-[14px] shrink-0 text-[#a0a0a0]" />
          <p className="text-[12px] leading-relaxed text-[#a0a0a0]">
            No cloud account required. Arciin does not require any hosted service — you own your data.
          </p>
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
      {message ? (
        <p
          className="rounded-xl px-4 py-3 text-center text-[12px] text-[#15803d]"
          style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
