"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { getAuthMe } from "@/lib/api/auth"
import { fetchApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { dispatchAppForeground, useAppForeground } from "@/lib/hooks/use-app-foreground"
import {
  authWithClientApiBase,
  pickClientApiBase,
} from "@/lib/connection/merge-auth"
import { isLoopbackApiBase } from "@/lib/connection/normalize-url"
import { reconnectToServer, type ReconnectResult } from "@/lib/connection/reconnect-server"
import { isNetworkError } from "@/lib/api/errors"
import {
  clearConnection,
  clearSession,
  connectionFromAuth,
  isConnectionExpired,
  loadConnection,
  loadServerProfile,
  saveConnection,
} from "@/lib/connection/storage"
import type { MobileConnection } from "@/lib/types/api"
import type { MobileAuthResult } from "@/lib/types/api"

function isAuthFailure(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403)
}

type ConnectionContextValue = {
  connection: MobileConnection | null
  ready: boolean
  /** false when the saved server cannot be reached (tunnel expired, offline, etc.). */
  serverReachable: boolean | null
  refresh: () => Promise<boolean>
  /** @param requestApiBase API base the phone used for login/pair (LAN IP, not server localhost). */
  applyAuth: (auth: MobileAuthResult, requestApiBase?: string) => void
  /** Change server URL; keeps your session when still valid (no full re-pair). */
  reconnectServer: (serverInput: string) => Promise<ReconnectResult>
  updateUser: (user: MobileConnection["user"]) => void
  signOut: () => void
  forgetServer: () => void
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<MobileConnection | null>(null)
  const [ready, setReady] = useState(false)
  const [serverReachable, setServerReachable] = useState<boolean | null>(null)

  const applyAuth = useCallback((auth: MobileAuthResult, requestApiBase?: string) => {
    const saved = loadServerProfile()?.apiBaseUrl
    const base = pickClientApiBase(
      requestApiBase ?? auth.server.apiBaseUrl,
      auth,
      saved,
    )
    const merged = isLoopbackApiBase(base)
      ? auth
      : authWithClientApiBase(auth, base)
    const next = connectionFromAuth(merged)
    saveConnection(next)
    setConnection(next)
  }, [])

  const refresh = useCallback(async () => {
    const stored = loadConnection()
    if (!stored || isConnectionExpired(stored)) {
      clearSession()
      setConnection(null)
      return false
    }

    if (isLoopbackApiBase(stored.apiBaseUrl)) {
      clearSession()
      setConnection(null)
      return false
    }

    try {
      const me = await getAuthMe(stored)
      const next = { ...stored, user: me.user }
      saveConnection(next)
      setConnection(next)
      setServerReachable(true)
      return true
    } catch (err) {
      if (isAuthFailure(err)) {
        clearSession()
        setConnection(null)
        setServerReachable(null)
        return false
      }
      if (isNetworkError(err)) {
        setConnection(stored)
        setServerReachable(false)
        return false
      }
      setConnection(stored)
      setServerReachable(true)
      return true
    }
  }, [])

  const reconnectServer = useCallback(
    async (serverInput: string) => {
      const result = await reconnectToServer(serverInput)
      if (result.status === "connected") {
        setConnection(result.connection)
        setServerReachable(true)
        dispatchAppForeground()
      } else if (result.status === "need_sign_in") {
        setConnection(null)
        setServerReachable(null)
      }
      return result
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    const stored = loadConnection()

    if (!stored || isConnectionExpired(stored)) {
      clearSession()
      if (!cancelled) {
        setConnection(null)
        setReady(true)
      }
      return () => {
        cancelled = true
      }
    }

    if (isLoopbackApiBase(stored.apiBaseUrl)) {
      clearSession()
      if (!cancelled) {
        setConnection(null)
        setReady(true)
      }
      return () => {
        cancelled = true
      }
    }

    if (!cancelled) {
      setConnection(stored)
      setReady(true)
    }

    void (async () => {
      try {
        const me = await getAuthMe(stored)
        if (!cancelled) {
          const next = { ...stored, user: me.user }
          saveConnection(next)
          setConnection(next)
          setServerReachable(true)
        }
      } catch (err) {
        if (!cancelled) {
          if (isAuthFailure(err)) {
            clearSession()
            setConnection(null)
            setServerReachable(null)
          } else if (isNetworkError(err)) {
            setServerReachable(false)
          }
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const updateUser = useCallback((user: MobileConnection["user"]) => {
    setConnection((prev) => {
      if (!prev) return prev
      const next = { ...prev, user }
      saveConnection(next)
      return next
    })
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setConnection(null)
  }, [])

  const forgetServer = useCallback(() => {
    clearConnection()
    setConnection(null)
  }, [])

  const probeServerOnForeground = useCallback(async () => {
    const stored = loadConnection()
    if (!stored || isConnectionExpired(stored) || isLoopbackApiBase(stored.apiBaseUrl)) {
      return
    }
    const probeAbort = new AbortController()
    const probeTimer = window.setTimeout(() => probeAbort.abort(), 8_000)
    try {
      await fetchApi<{ status?: string }>("/health", {
        connection: stored,
        signal: probeAbort.signal,
      })
      dispatchAppForeground()
      setServerReachable(true)
      await refresh()
    } catch {
      setServerReachable(false)
    } finally {
      window.clearTimeout(probeTimer)
    }
  }, [refresh])

  useAppForeground(() => {
    void probeServerOnForeground()
  })

  const value = useMemo(
    () => ({
      connection,
      ready,
      serverReachable,
      refresh,
      applyAuth,
      reconnectServer,
      updateUser,
      signOut,
      forgetServer,
    }),
    [
      connection,
      ready,
      serverReachable,
      refresh,
      applyAuth,
      reconnectServer,
      updateUser,
      signOut,
      forgetServer,
    ],
  )

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>
}

export function useConnection() {
  const ctx = useContext(ConnectionContext)
  if (!ctx) {
    throw new Error("useConnection must be used within ConnectionProvider")
  }
  return ctx
}
