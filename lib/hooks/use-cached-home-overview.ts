"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { fetchHomeOverview } from "@/lib/api/dashboard"
import { formatApiError } from "@/lib/api/errors"
import { ARCIIN_FOREGROUND_EVENT } from "@/lib/hooks/use-app-foreground"
import { useConnection } from "@/components/providers/connection-provider"
import type { HomeOverview } from "@/lib/types/models"

const HOME_STALE_MS = 60_000

const homeCache = new Map<string, { data: HomeOverview; fetchedAt: number }>()

export function useCachedHomeOverview() {
  const { connection, ready } = useConnection()
  const sessionKey = connection?.sessionToken ?? null
  const connectionRef = useRef(connection)
  connectionRef.current = connection

  const [data, setData] = useState<HomeOverview | null>(() => {
    if (!sessionKey) return null
    return homeCache.get(sessionKey)?.data ?? null
  })
  const [loading, setLoading] = useState(false)
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (opts?: { background?: boolean; signal?: AbortSignal }) => {
      const conn = connectionRef.current
      if (!conn) return
      if (!opts?.background) {
        setLoading(true)
      } else {
        setIsRevalidating(true)
      }
      setError(null)
      try {
        const overview = await fetchHomeOverview(conn, opts?.signal)
        setData(overview)
        if (sessionKey) {
          homeCache.set(sessionKey, { data: overview, fetchedAt: Date.now() })
        }
      } catch (err) {
        if (!opts?.signal?.aborted) setError(formatApiError(err))
      } finally {
        if (!opts?.signal?.aborted) {
          setLoading(false)
          setIsRevalidating(false)
        }
      }
    },
    [sessionKey],
  )

  useEffect(() => {
    if (!ready || !sessionKey || !connection) return

    const hit = homeCache.get(sessionKey)
    const fresh = hit && Date.now() - hit.fetchedAt <= HOME_STALE_MS

    if (hit) {
      setData(hit.data)
    }

    if (fresh) return

    const controller = new AbortController()
    void load({
      background: Boolean(hit),
      signal: controller.signal,
    })
    return () => controller.abort()
  }, [ready, sessionKey, connection, load])

  useEffect(() => {
    const onForeground = () => {
      if (!sessionKey) return
      const hit = homeCache.get(sessionKey)
      if (!hit || Date.now() - hit.fetchedAt > HOME_STALE_MS) {
        void load({ background: Boolean(hit) })
      }
    }
    window.addEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
    return () => window.removeEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
  }, [sessionKey, load])

  return { data, loading, isRevalidating, error, reload: () => void load() }
}
