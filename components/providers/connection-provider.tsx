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
import {
  applyServerEndpointsToConnection,
  resolveReachableServer,
} from "@/lib/connection/resolve-reachable-server"
import { serverProfileFromAuth } from "@/lib/connection/server-profile"
import { getMobileSocketUrl } from "@/lib/realtime/socket-url"
import { io, type Socket } from "socket.io-client"
import type { SocketEventPayload } from "@/lib/types/events"
import { isNetworkError } from "@/lib/api/errors"
import {
  connectionFromAccount,
  listMobileAccounts,
  removeAccount,
  setActiveAccount,
  type MobileAccount,
} from "@/lib/connection/accounts"
import {
  clearSession,
  connectionFromAuth,
  isConnectionExpired,
  loadConnection,
  loadServerProfile,
  saveConnection,
  saveServerProfile,
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
  /** Probe saved URL, then LAN / canonical URL — no new pairing code. */
  tryAutoReconnect: () => Promise<boolean>
  updateUser: (user: MobileConnection["user"]) => void
  signOut: () => void
  forgetServer: () => void
  accounts: MobileAccount[]
  switchAccount: (accountId: string) => Promise<boolean>
  /** Remove a saved server from this phone (instance on the server is untouched). */
  deleteServer: (accountId: string) => void
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<MobileConnection | null>(null)
  const [ready, setReady] = useState(false)
  const [serverReachable, setServerReachable] = useState<boolean | null>(null)
  const [accountsTick, setAccountsTick] = useState(0)

  const accounts = useMemo(() => {
    void accountsTick
    return listMobileAccounts()
  }, [accountsTick, connection?.apiBaseUrl])

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
    saveServerProfile(serverProfileFromAuth(merged))
    saveConnection(next)
    setConnection(next)
    setAccountsTick((n) => n + 1)
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
    clearSession()
    setConnection(null)
    setAccountsTick((n) => n + 1)
  }, [])

  const deleteServer = useCallback(
    (accountId: string) => {
      removeAccount(accountId)
      const next = loadConnection()
      if (next && !isConnectionExpired(next) && !isLoopbackApiBase(next.apiBaseUrl)) {
        setConnection(next)
        setServerReachable(null)
        void refresh()
      } else {
        if (next && (isConnectionExpired(next) || isLoopbackApiBase(next.apiBaseUrl))) {
          clearSession()
        }
        setConnection(next)
        setServerReachable(null)
      }
      if (!listMobileAccounts().length) {
        setConnection(null)
        setServerReachable(null)
      }
      setAccountsTick((n) => n + 1)
    },
    [refresh],
  )

  const switchAccount = useCallback(async (accountId: string) => {
    const account = setActiveAccount(accountId)
    if (!account) return false

    const stored = connectionFromAccount(account)
    if (!stored || isConnectionExpired(stored)) {
      clearSession()
      setConnection(null)
      setAccountsTick((n) => n + 1)
      return false
    }

    if (isLoopbackApiBase(stored.apiBaseUrl)) {
      clearSession()
      setConnection(null)
      setAccountsTick((n) => n + 1)
      return false
    }

    setConnection(stored)
    try {
      const me = await getAuthMe(stored)
      const next = { ...stored, user: me.user }
      saveConnection(next)
      setConnection(next)
      setServerReachable(true)
      setAccountsTick((n) => n + 1)
      dispatchAppForeground()
      return true
    } catch (err) {
      if (isAuthFailure(err)) {
        clearSession()
        setConnection(null)
        setServerReachable(null)
        setAccountsTick((n) => n + 1)
        return false
      }
      if (isNetworkError(err)) {
        setConnection(stored)
        setServerReachable(false)
        setAccountsTick((n) => n + 1)
        return true
      }
      setConnection(stored)
      setServerReachable(true)
      setAccountsTick((n) => n + 1)
      return true
    }
  }, [])

  const tryAutoReconnect = useCallback(async (): Promise<boolean> => {
    const stored = loadConnection()
    if (!stored || isConnectionExpired(stored) || isLoopbackApiBase(stored.apiBaseUrl)) {
      return false
    }
    const probeAbort = new AbortController()
    const probeTimer = window.setTimeout(() => probeAbort.abort(), 10_000)
    try {
      await fetchApi<{ status?: string }>("/health", {
        connection: stored,
        signal: probeAbort.signal,
      })
      setServerReachable(true)
      await refresh()
      return true
    } catch {
      const resolved = await resolveReachableServer(stored, loadServerProfile(), probeAbort.signal)
      if (resolved) {
        saveServerProfile(resolved.server)
        const next = applyServerEndpointsToConnection(stored, resolved.server)
        saveConnection(next)
        setConnection(next)
        setServerReachable(true)
        dispatchAppForeground()
        await refresh()
        return true
      }
      setServerReachable(false)
      return false
    } finally {
      window.clearTimeout(probeTimer)
    }
  }, [refresh])

  const probeServerOnForeground = useCallback(async () => {
    const ok = await tryAutoReconnect()
    if (ok) dispatchAppForeground()
  }, [tryAutoReconnect])

  useAppForeground(() => {
    void probeServerOnForeground()
  })

  useEffect(() => {
    const stored = loadConnection()
    if (!stored || isConnectionExpired(stored)) return

    const socketUrl = getMobileSocketUrl(stored)
    const socket: Socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      auth: { token: stored.sessionToken },
      extraHeaders: { Authorization: `Bearer ${stored.sessionToken}` },
    })

    const onUrlsUpdated = (event: SocketEventPayload) => {
      const data = event.data as
        | {
            apiBaseUrl?: string
            socketUrl?: string
            webUrl?: string
            instanceName?: string
          }
        | undefined
      if (!data?.apiBaseUrl) return
      const current = loadConnection()
      if (!current || isConnectionExpired(current)) return

      const profile = loadServerProfile()
      const server = {
        apiBaseUrl: data.apiBaseUrl,
        socketUrl: data.socketUrl ?? data.apiBaseUrl.replace(/\/api\/?$/, ""),
        webUrl: data.webUrl ?? data.apiBaseUrl.replace(/\/api\/?$/, ""),
        instanceName: data.instanceName ?? profile?.instanceName ?? current.instanceName,
        instanceId: profile?.instanceId,
        canonicalPublicUrl: data.webUrl ?? profile?.canonicalPublicUrl,
        lanFallbackUrls: profile?.lanFallbackUrls,
      }
      saveServerProfile(server)
      const next = applyServerEndpointsToConnection(current, server)
      saveConnection(next)
      setConnection(next)
      setServerReachable(true)
    }

    socket.on("instance.urls.updated", onUrlsUpdated)
    return () => {
      socket.off("instance.urls.updated", onUrlsUpdated)
      socket.disconnect()
    }
  }, [connection?.sessionToken, connection?.apiBaseUrl])

  const value = useMemo(
    () => ({
      connection,
      ready,
      serverReachable,
      refresh,
      applyAuth,
      reconnectServer,
      tryAutoReconnect,
      updateUser,
      signOut,
      forgetServer,
      accounts,
      switchAccount,
      deleteServer,
    }),
    [
      connection,
      ready,
      serverReachable,
      refresh,
      applyAuth,
      reconnectServer,
      tryAutoReconnect,
      updateUser,
      signOut,
      forgetServer,
      accounts,
      switchAccount,
      deleteServer,
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
