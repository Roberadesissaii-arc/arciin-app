"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useConnection } from "@/components/providers/connection-provider"
import { isFirstRunSetupContext } from "@/lib/standalone/first-run"
import { loadStandaloneInstanceGate } from "@/lib/standalone/instance-gate"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { ready, connection, refresh } = useConnection()

  useEffect(() => {
    if (!ready) return
    if (connection) return

    let cancelled = false
    void (async () => {
      const gate = await loadStandaloneInstanceGate()
      if (cancelled) return
      if (!gate.instanceReady || isFirstRunSetupContext(gate)) {
        router.replace("/setup")
        return
      }
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`)
    })()

    return () => {
      cancelled = true
    }
  }, [ready, connection, pathname, router])

  useEffect(() => {
    if (!ready || !connection) return
    const id = setInterval(() => {
      void refresh()
    }, 5 * 60_000)
    return () => clearInterval(id)
  }, [ready, connection, refresh])

  if (!ready) {
    return null
  }

  if (!connection) {
    return null
  }

  return <>{children}</>
}
