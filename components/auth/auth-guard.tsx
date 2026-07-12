"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useConnection } from "@/components/providers/connection-provider"
import { hasStoredServer } from "@/lib/connection/storage"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { ready, connection, refresh } = useConnection()

  useEffect(() => {
    if (!ready) return
    if (connection) return

    if (hasStoredServer()) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`)
      return
    }

    router.replace("/connect")
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
