"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useConnection } from "@/components/providers/connection-provider"
import { isFirstRunSetupContext } from "@/lib/standalone/first-run"
import { loadStandaloneInstanceGate } from "@/lib/standalone/instance-gate"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"

export function AuthRedirect() {
  const router = useRouter()
  const { ready, connection, refresh } = useConnection()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return

    let cancelled = false
    void (async () => {
      const gate = await loadStandaloneInstanceGate()
      if (cancelled) return

      if (!gate.instanceReady || isFirstRunSetupContext(gate)) {
        router.replace("/setup")
        return
      }

      if (connection) {
        const ok = await refresh()
        if (cancelled) return
        router.replace(ok ? "/home" : "/sign-in")
        return
      }
      router.replace("/sign-in")
    })()

    return () => {
      cancelled = true
    }
  }, [ready, connection, refresh, router])

  useEffect(() => {
    if (!ready) {
      const t = window.setTimeout(() => {
        setError(
          "App is taking too long to start. Check that the Arciin API is running (port 4000) and restart the mobile dev server.",
        )
      }, 12_000)
      return () => window.clearTimeout(t)
    }
  }, [ready])

  if (error && !ready) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[14px] leading-relaxed text-[#717171]">{error}</p>
        <p className="font-mono text-[11px] text-[#a0a0a0]">{getStandaloneApiBaseUrl()}</p>
        <button
          type="button"
          onClick={() => router.replace("/setup")}
          className="rounded-2xl bg-gradient-to-br from-[#ff6a30] to-[#cc2e00] px-6 py-3 text-[14px] font-semibold text-white"
        >
          Open setup
        </button>
      </div>
    )
  }

  return null
}
