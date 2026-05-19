"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { ARCIIN_FOREGROUND_EVENT } from "@/lib/hooks/use-app-foreground"
import type { MobileConnection } from "@/lib/types/api"

/**
 * Fetch panel data once per session while enabled. Avoids `connection` in deps
 * (object identity changes abort in-flight requests and cause infinite loading).
 */
export function useStablePanelLoad<T>(
  enabled: boolean,
  loader: (connection: MobileConnection, signal: AbortSignal) => Promise<T>,
) {
  const { connection, ready } = useConnection()
  const sessionKey = connection?.sessionToken ?? null
  const connectionRef = useRef(connection)
  connectionRef.current = connection

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedSessionRef = useRef<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (sessionKey && loadedSessionRef.current && loadedSessionRef.current !== sessionKey) {
      loadedSessionRef.current = null
      setData(null)
    }
    if (!sessionKey) {
      loadedSessionRef.current = null
      setData(null)
    }
  }, [sessionKey])

  const reload = useCallback(() => {
    loadedSessionRef.current = null
    setReloadToken((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      loadedSessionRef.current = null
      return
    }
    if (!ready || !sessionKey) return
    if (loadedSessionRef.current === sessionKey) return

    const conn = connectionRef.current
    if (!conn) return

    let cancelled = false
    const ac = new AbortController()

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await loader(conn, ac.signal)
        if (cancelled) return
        setData(result)
        loadedSessionRef.current = sessionKey
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [enabled, ready, sessionKey, loader, reloadToken])

  useEffect(() => {
    if (!error) return
    const onForeground = () => reload()
    window.addEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
    return () => window.removeEventListener(ARCIIN_FOREGROUND_EVENT, onForeground)
  }, [error, reload])

  const waiting =
    enabled && data === null && error === null && (!ready || !sessionKey || loading)

  return {
    data,
    setData,
    loading: waiting,
    error,
    connection,
    ready,
    sessionKey,
    reload,
  }
}
