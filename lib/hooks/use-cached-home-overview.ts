"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { fetchHomeOverview } from "@/lib/api/dashboard"
import { formatApiError } from "@/lib/api/errors"
import { ARCIIN_FOREGROUND_EVENT } from "@/lib/hooks/use-app-foreground"
import { useConnection } from "@/components/providers/connection-provider"
import { suppressFetchErrorWhenOffline } from "@/lib/connection/offline-ui"
import type { HomeOverview } from "@/lib/types/models"

const HOME_STALE_MS = 60_000
const HOME_CACHE_VERSION = 3

const homeCache = new Map<
  string,
  { data: HomeOverview; fetchedAt: number; version: number }
>()

function isValidHomeOverview(data: HomeOverview | null | undefined): data is HomeOverview {
  return Boolean(
    data &&
      typeof data.jobCount === "number" &&
      typeof data.runningJobs === "number" &&
      Array.isArray(data.recentJobs),
  )
}

export function useCachedHomeOverview() {
  const { connection, ready, serverReachable } = useConnection()
  const sessionKey = connection?.sessionToken ?? null
  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const serverReachableRef = useRef(serverReachable)
  serverReachableRef.current = serverReachable

  const [data, setData] = useState<HomeOverview | null>(() => {
    if (!sessionKey) return null
    const hit = homeCache.get(sessionKey)
    return hit && hit.version === HOME_CACHE_VERSION && isValidHomeOverview(hit.data)
      ? hit.data
      : null
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
          homeCache.set(sessionKey, {
            data: overview,
            fetchedAt: Date.now(),
            version: HOME_CACHE_VERSION,
          })
        }
      } catch (err) {
        if (!opts?.signal?.aborted) {
          setError(
            suppressFetchErrorWhenOffline(
              serverReachableRef.current,
              formatApiError(err),
            ),
          )
        }
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
    if (serverReachable === false) setError(null)
  }, [serverReachable])

  useEffect(() => {
    if (!ready || !sessionKey || !connection) return
    if (serverReachable === false) return

    const hit = homeCache.get(sessionKey)
    const validHit =
      hit && hit.version === HOME_CACHE_VERSION && isValidHomeOverview(hit.data)
    const fresh = validHit && Date.now() - hit.fetchedAt <= HOME_STALE_MS

    if (validHit) {
      setData(hit.data)
    }

    if (fresh) return

    const controller = new AbortController()
    void load({
      background: Boolean(validHit),
      signal: controller.signal,
    })
    return () => controller.abort()
  }, [ready, sessionKey, load, serverReachable])

  useEffect(() => {
    const onForeground = () => {
      if (!sessionKey) return
      const hit = homeCache.get(sessionKey)
      const validHit =
        hit && hit.version === HOME_CACHE_VERSION && isValidHomeOverview(hit.data)
      if (!validHit || Date.now() - hit.fetchedAt > HOME_STALE_MS) {
        void load({ background: Boolean(validHit) })
      }
    }
    window.addEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
    return () => window.removeEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
  }, [sessionKey, load])

  return { data, loading, isRevalidating, error, reload: () => void load() }
}
