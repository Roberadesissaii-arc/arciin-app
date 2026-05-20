"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { ARCIIN_FOREGROUND_EVENT } from "@/lib/hooks/use-app-foreground"
import type { MobileConnection } from "@/lib/types/api"

const DEFAULT_STALE_MS = 90_000

type CacheEntry<T> = { data: T; fetchedAt: number }

const memoryCache = new Map<string, CacheEntry<unknown>>()

function readCache<T>(key: string | null): CacheEntry<T> | null {
  if (!key) return null
  return (memoryCache.get(key) as CacheEntry<T> | undefined) ?? null
}

function writeCache<T>(key: string | null, data: T) {
  if (!key) return
  memoryCache.set(key, { data, fetchedAt: Date.now() })
}

export type StablePanelLoadOptions = {
  cacheKey?: string
  staleTimeMs?: number
}

export function useStablePanelLoad<T>(
  enabled: boolean,
  loader: (connection: MobileConnection, signal: AbortSignal) => Promise<T>,
  options?: StablePanelLoadOptions,
) {
  const { connection, ready } = useConnection()
  const sessionKey = connection?.sessionToken ?? null
  const connectionRef = useRef(connection)
  connectionRef.current = connection

  const staleTimeMs = options?.staleTimeMs ?? DEFAULT_STALE_MS
  const storageKey =
    options?.cacheKey && sessionKey ? `${sessionKey}:${options.cacheKey}` : null

  const [data, setData] = useState<T | null>(() => readCache<T>(storageKey)?.data ?? null)
  const [loading, setLoading] = useState(false)
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => {
    if (storageKey) memoryCache.delete(storageKey)
    setReloadToken((n) => n + 1)
  }, [storageKey])

  useEffect(() => {
    if (!enabled || !ready || !sessionKey) return

    const conn = connectionRef.current
    if (!conn) return

    const cached = readCache<T>(storageKey)
    const fresh = cached != null && Date.now() - cached.fetchedAt <= staleTimeMs

    if (fresh) {
      if (data !== cached.data) setData(cached.data)
      return
    }

    let cancelled = false
    const ac = new AbortController()
    const background = cached != null

    if (background) {
      setIsRevalidating(true)
      if (data !== cached.data) setData(cached.data)
    } else {
      setLoading(true)
    }
    setError(null)

    void (async () => {
      try {
        const result = await loader(conn, ac.signal)
        if (cancelled) return
        setData(result)
        writeCache(storageKey, result)
      } catch (err) {
        if (!cancelled) {
          const conn = connectionRef.current
          setError(
            formatApiError(err, conn?.webUrl ?? conn?.apiBaseUrl),
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setIsRevalidating(false)
        }
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [enabled, ready, sessionKey, loader, reloadToken, storageKey, staleTimeMs])

  useEffect(() => {
    if (!sessionKey) {
      setData(null)
    }
  }, [sessionKey])

  useEffect(() => {
    if (!error) return
    const onForeground = () => reload()
    window.addEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
    return () => window.removeEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
  }, [error, reload])

  useEffect(() => {
    const onForeground = () => {
      if (!enabled || !ready || !sessionKey) return
      const cached = readCache<T>(storageKey)
      if (!cached || Date.now() - cached.fetchedAt > staleTimeMs) {
        reload()
      }
    }
    window.addEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
    return () => window.removeEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
  }, [enabled, ready, sessionKey, storageKey, staleTimeMs, reload])

  const waiting = enabled && data === null && error === null && (!ready || !sessionKey || loading)

  return {
    data,
    setData,
    loading: waiting,
    isRevalidating,
    error,
    connection,
    ready,
    sessionKey,
    reload,
  }
}
