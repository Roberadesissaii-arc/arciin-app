"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError, isNetworkError } from "@/lib/api/errors"
import { ARCIIN_FOREGROUND_EVENT } from "@/lib/hooks/use-app-foreground"
import type { MobileConnection } from "@/lib/types/api"

const DEFAULT_STALE_MS = 90_000
const OFFLINE_STALE_MS = 7 * 24 * 60 * 60 * 1000
const PANEL_CACHE_LS_PREFIX = "arciin_panel_cache_v1:"

type CacheEntry<T> = { data: T; fetchedAt: number }

const memoryCache = new Map<string, CacheEntry<unknown>>()

function readCache<T>(key: string | null): CacheEntry<T> | null {
  if (!key) return null
  const mem = memoryCache.get(key) as CacheEntry<T> | undefined
  if (mem) return mem
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`${PANEL_CACHE_LS_PREFIX}${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry<T>
    if (parsed?.data === undefined) return null
    memoryCache.set(key, parsed as CacheEntry<unknown>)
    return parsed
  } catch {
    return null
  }
}

function writeCache<T>(key: string | null, data: T) {
  if (!key) return
  const entry: CacheEntry<T> = { data, fetchedAt: Date.now() }
  memoryCache.set(key, entry as CacheEntry<unknown>)
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${PANEL_CACHE_LS_PREFIX}${key}`, JSON.stringify(entry))
  } catch {
    /* quota */
  }
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
  const { connection, ready, serverReachable } = useConnection()
  const sessionKey = connection?.sessionToken ?? null
  const connectionRef = useRef(connection)
  connectionRef.current = connection

  const staleTimeMs = options?.staleTimeMs ?? DEFAULT_STALE_MS
  const storageKey =
    options?.cacheKey && sessionKey ? `${sessionKey}:${options.cacheKey}` : null

  const [data, setDataState] = useState<T | null>(() => readCache<T>(storageKey)?.data ?? null)
  const localMutationRef = useRef(0)

  const setData = useCallback(
    (
      value: T | null | ((prev: T | null) => T | null),
      opts?: { fromFetch?: boolean },
    ) => {
      if (!opts?.fromFetch) localMutationRef.current += 1
      setDataState((prev) => {
        const next =
          typeof value === "function"
            ? (value as (current: T | null) => T | null)(prev)
            : value
        if (next != null) writeCache(storageKey, next)
        return next
      })
    },
    [storageKey],
  )
  const [loading, setLoading] = useState(false)
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showingCachedOffline, setShowingCachedOffline] = useState(
    () => readCache<T>(storageKey) != null,
  )
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => {
    if (storageKey) {
      memoryCache.delete(storageKey)
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`${PANEL_CACHE_LS_PREFIX}${storageKey}`)
        } catch {
          /* ignore */
        }
      }
    }
    setReloadToken((n) => n + 1)
  }, [storageKey])

  useEffect(() => {
    if (!enabled || !ready || !sessionKey) return

    const conn = connectionRef.current
    if (!conn) return

    const cached = readCache<T>(storageKey)
    const staleBudget = serverReachable === false ? OFFLINE_STALE_MS : staleTimeMs
    const fresh = cached != null && Date.now() - cached.fetchedAt <= staleBudget

    if (fresh) {
      setDataState((prev) => (prev !== cached.data ? cached.data : prev))
      setShowingCachedOffline(serverReachable === false)
      if (serverReachable !== false) return
    }

    let cancelled = false
    const ac = new AbortController()
    const background = cached != null

    if (background) {
      setIsRevalidating(true)
      setDataState((prev) => (prev !== cached.data ? cached.data : prev))
    } else {
      setLoading(true)
    }
    if (!cached?.data) setError(null)

    const mutationAtStart = localMutationRef.current

    void (async () => {
      try {
        const result = await loader(conn, ac.signal)
        if (cancelled) return
        if (mutationAtStart !== localMutationRef.current) return
        setData(result, { fromFetch: true })
        setShowingCachedOffline(false)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          const conn = connectionRef.current
          if (cached?.data != null && isNetworkError(err)) {
            setData(cached.data)
            setShowingCachedOffline(true)
            setError(null)
          } else {
            setError(formatApiError(err, conn?.webUrl ?? conn?.apiBaseUrl))
            setShowingCachedOffline(false)
          }
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
  }, [enabled, ready, sessionKey, loader, reloadToken, storageKey, staleTimeMs, serverReachable])

  useEffect(() => {
    if (!sessionKey) {
      setDataState(null)
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
    showingCachedOffline,
    connection,
    ready,
    sessionKey,
    reload,
  }
}
