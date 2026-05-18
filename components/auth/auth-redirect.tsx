"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useConnection } from "@/components/providers/connection-provider"

export function AuthRedirect() {
  const router = useRouter()
  const { ready, connection, refresh } = useConnection()

  useEffect(() => {
    if (!ready) return
    void (async () => {
      if (connection) {
        const ok = await refresh()
        router.replace(ok ? "/home" : "/sign-in")
        return
      }
      router.replace("/sign-in")
    })()
  }, [ready, connection, refresh, router])

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f7f7]">
      <span className="size-8 animate-spin rounded-full border-2 border-[#ff4f12]/30 border-t-[#ff4f12]" />
    </div>
  )
}
