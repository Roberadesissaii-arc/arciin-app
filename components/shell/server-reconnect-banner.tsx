"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, Server } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { isPublicServerAddress } from "@/lib/connection/normalize-url"
import { dispatchAppForeground } from "@/lib/hooks/use-app-foreground"

export function ServerReconnectBanner() {
  const pathname = usePathname()
  const { connection, serverReachable, tryAutoReconnect } = useConnection()
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (serverReachable !== false) return
    setRetrying(true)
    void tryAutoReconnect().finally(() => setRetrying(false))
  }, [serverReachable, tryAutoReconnect])

  if (!connection || serverReachable !== false) return null
  if (pathname.startsWith("/sign-in")) return null

  const publicUrl = isPublicServerAddress(
    connection.webUrl ?? connection.apiBaseUrl,
  )

  async function handleRetry() {
    setRetrying(true)
    try {
      const ok = await tryAutoReconnect()
      if (ok) dispatchAppForeground()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="server-offline-banner shadow-[0_1px_0_rgba(0,0,0,0.04)]" role="alert">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
        <div className="server-offline-banner__ring" />
      </div>
      <div className="server-offline-banner__panel">
        <div className="flex items-start gap-3.5 px-4 py-3.5">
          <div className="accent-icon-tile flex size-11 shrink-0 items-center justify-center rounded-2xl">
            <Server className="text-accent size-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-tight text-[#222222]">
              {retrying ? "Reconnecting to your server…" : "Your server is disconnected"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
              {retrying
                ? "Arciin is checking your saved address and LAN fallbacks. Cached screens may still show until the connection is back."
                : publicUrl
                  ? "Your tunnel URL may have changed after a restart. Arciin retries automatically every few seconds on Wi‑Fi — keep the app open or tap Try again."
                  : "Confirm Arciin is running and this phone is on the same Wi‑Fi as your server. Arciin will keep trying in the background."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/profile"
                className="text-accent text-[12px] font-semibold underline-offset-2 hover:underline"
              >
                Update server address
              </Link>
              <button
                type="button"
                onClick={() => void handleRetry()}
                disabled={retrying}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#444444] disabled:opacity-50"
              >
                {retrying ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
