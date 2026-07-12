"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useConnection } from "@/components/providers/connection-provider"
import { hasStoredServer } from "@/lib/connection/storage"
import { loadStandaloneInstanceGate } from "@/lib/standalone/instance-gate"

export function AuthRedirect() {
  const router = useRouter()
  const { ready, connection, refresh } = useConnection()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return

    let cancelled = false
    void (async () => {
      if (connection) {
        const ok = await refresh()
        if (cancelled) return
        router.replace(ok ? "/home" : hasStoredServer() ? "/sign-in" : "/connect")
        return
      }

      if (hasStoredServer()) {
        router.replace("/sign-in")
        return
      }

      // No stored server yet. If this device is co-located with an Arciin server
      // that hasn't been claimed, let the user do first-run setup right here.
      try {
        const gate = await loadStandaloneInstanceGate({ refresh: true })
        if (cancelled) return
        if (gate.status && !gate.instanceReady) {
          router.replace("/setup")
          return
        }
        if (gate.instanceReady) {
          router.replace("/sign-in")
          return
        }
      } catch {
        /* co-located API unreachable — fall back to manual connect */
      }
      if (cancelled) return

      router.replace("/connect")
    })()

    return () => {
      cancelled = true
    }
  }, [ready, connection, refresh, router])

  useEffect(() => {
    if (!ready) {
      const t = window.setTimeout(() => {
        setError(
          "App is taking too long to start. Enter your Arciin server address on the connect screen.",
        )
      }, 12_000)
      return () => window.clearTimeout(t)
    }
  }, [ready])

  if (error && !ready) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[14px] leading-relaxed text-[#717171]">{error}</p>
        <button
          type="button"
          onClick={() => router.replace("/connect")}
          className="rounded-2xl bg-gradient-to-br from-[#ff6a30] to-[#cc2e00] px-6 py-3 text-[14px] font-semibold text-white"
        >
          Connect to server
        </button>
      </div>
    )
  }

  return null
}
