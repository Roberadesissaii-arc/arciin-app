"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Loader2, PackagePlus, Plug } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { listIntegrations } from "@/lib/api/settings"
import type { IntegrationSummary } from "@/lib/types/models"

const INTEGRATION_META: Record<
  string,
  { description: string; color: string; comingSoon?: boolean }
> = {
  PLEX: {
    description: "Stream your media library via Plex Media Server.",
    color: "#e5a00d",
  },
  JELLYFIN: {
    description: "Open-source media server for your collection.",
    color: "#00a4dc",
  },
  EMBY: {
    description: "Personal media server with live TV support.",
    color: "#52b54b",
    comingSoon: true,
  },
}

function statusFor(integration: IntegrationSummary) {
  if (integration.enabled) return { label: "Connected", color: "#22c55e", bg: "rgba(34,197,94,0.08)" }
  return { label: "Not connected", color: "#a0a0a0", bg: "#f7f7f7" }
}

export function IntegrationsPage() {
  const { connection, ready } = useConnection()
  const [integrations, setIntegrations] = useState<IntegrationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !connection) return
    let cancelled = false
    const ac = new AbortController()

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await listIntegrations(connection, ac.signal)
        if (!cancelled) setIntegrations(list)
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

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex items-start gap-3 rounded-2xl bg-white p-4"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(255,79,18,0.08)", border: "1px solid rgba(255,79,18,0.2)" }}
        >
          <PackagePlus className="size-[15px]" style={{ color: "#ff4f12" }} />
        </div>
        <p className="text-[12px] leading-relaxed text-[#717171]">
          Connect Arciin to media servers and other services. Your data stays on your server —
          integrations only sync metadata and library structure.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-7 animate-spin text-[#a0a0a0]" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {integrations.map((integration) => {
            const meta = INTEGRATION_META[integration.type] ?? {
              description: "Integration for your Arciin instance.",
              color: "#717171",
            }
            const status = meta.comingSoon
              ? { label: "Coming soon", color: "#a0a0a0", bg: "#f7f7f7" }
              : statusFor(integration)

            return (
              <div
                key={integration.id}
                className="overflow-hidden rounded-2xl bg-white"
                style={{ border: "1px solid #e5e5e5" }}
              >
                <div className="flex items-center gap-3.5 px-4 py-4">
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
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#a0a0a0]">
                      {meta.description}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[#c0c0c0]" />
                </div>
              </div>
            )
          })}
        </div>
      )}

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
