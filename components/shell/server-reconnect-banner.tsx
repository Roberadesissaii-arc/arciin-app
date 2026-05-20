"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Loader2, Server } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { isPublicServerAddress } from "@/lib/connection/normalize-url"
import { dispatchAppForeground } from "@/lib/hooks/use-app-foreground"

export function ServerReconnectBanner() {
  const pathname = usePathname()
  const { connection, serverReachable, refresh } = useConnection()
  const [retrying, setRetrying] = useState(false)

  if (!connection || serverReachable !== false) return null
  if (pathname.startsWith("/sign-in")) return null

  const publicUrl = isPublicServerAddress(
    connection.webUrl ?? connection.apiBaseUrl,
  )

  async function handleRetry() {
    setRetrying(true)
    try {
      const ok = await refresh()
      if (ok) dispatchAppForeground()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]"
      style={{ border: "1px solid #e8e8e8" }}
      role="alert"
    >
      <div
        className="h-0.5 w-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,79,18,0.55) 0%, rgba(255,106,51,0.25) 55%, transparent 100%)",
        }}
        aria-hidden
      />
      <div className="flex items-start gap-3.5 px-4 py-3.5">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(145deg, #fff7ed 0%, #f7f7f7 100%)",
            border: "1px solid #fde8d8",
          }}
        >
          <Server className="size-5 text-[#ff4f12]" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold tracking-tight text-[#222222]">
            Your server is disconnected
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
            {publicUrl
              ? "Your tunnel or public URL may have expired. Update the address under Profile → Remote access, or wait a moment if Arciin is restarting."
              : "Confirm Arciin is running and this phone is on the same Wi‑Fi as your server, or update the address under Profile → Remote access."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/profile"
              className="text-[12px] font-semibold text-[#ff4f12] underline-offset-2 hover:underline"
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
  )
}
