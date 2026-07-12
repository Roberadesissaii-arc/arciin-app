"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { getAuthMe } from "@/lib/api/auth"
import { clearCachedUserAvatar } from "@/lib/utils/user-avatar-cache"
import { ApiError, isNetworkError } from "@/lib/api/errors"
import {
  ARCIIN_RECONNECT_EVENT,
  dispatchAppForeground,
  useAppForeground,
} from "@/lib/hooks/use-app-foreground"
import { isTransientUpstreamStatus } from "@/lib/api/errors"
import {
  authWithClientApiBase,
  pickClientApiBase,
} from "@/lib/connection/merge-auth"
import { isLoopbackApiBase } from "@/lib/connection/normalize-url"
import { pickSocketOrigin } from "@/lib/connection/pick-socket-origin"
import { reconnectToServer, type ReconnectResult } from "@/lib/connection/reconnect-server"
import {
  applyServerEndpointsToConnection,
  resolveReachableServer,
} from "@/lib/connection/resolve-reachable-server"
import { serverProfileFromAuth } from "@/lib/connection/server-profile"
import { notifyIfPublicWebUrlChanged } from "@/lib/connection/notify-url-change"
import { notifyMobileActivityCreated } from "@/lib/notifications/activity-created"
import { mobileToast } from "@/lib/notifications/mobile-toast"
import { shouldSuppressMobileUploadNotice } from "@/lib/uploads/mobile-upload-batch"
import { syncServerUrls, type SyncServerUrlsResult } from "@/lib/connection/sync-server-url"
import { io, type Socket } from "socket.io-client"
import type { SocketEventPayload } from "@/lib/types/events"
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
import { isStandaloneApp } from "@/lib/standalone/config"
import { bootstrapStandaloneServerProfile } from "@/lib/standalone/bootstrap-server"
import {
  repairStandaloneConnection,
  repairStandaloneServerProfile,
} from "@/lib/standalone/repair-server-urls"

function isAuthFailure(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403)
}

function connectionsEqual(a: MobileConnection | null, b: MobileConnection | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.sessionToken === b.sessionToken &&
    a.apiBaseUrl === b.apiBaseUrl &&
    a.webUrl === b.webUrl &&
    a.socketUrl === b.socketUrl &&
    a.instanceName === b.instanceName &&
    a.user?.id === b.user?.id &&
    a.user?.name === b.user?.name &&
    a.user?.email === b.user?.email &&
    a.user?.avatarUrl === b.user?.avatarUrl &&
    a.user?.updatedAt === b.user?.updatedAt
  )
}

function connectionWithAuthMeUser(
  stored: MobileConnection,
  me: Awaited<ReturnType<typeof getAuthMe>>,
): MobileConnection {
  const prevUser = stored.user
  if (
    prevUser.id === me.user.id &&
    (prevUser.avatarUrl !== me.user.avatarUrl ||
      prevUser.updatedAt !== me.user.updatedAt)
  ) {
    clearCachedUserAvatar(me.user.id)
  }
  return { ...stored, user: me.user }
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

const URL_SYNC_INTERVAL_MS = 20_000
const OFFLINE_RECONNECT_INTERVAL_MS = 6_000

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<MobileConnection | null>(null)
  const [ready, setReady] = useState(false)
  const [serverReachable, setServerReachable] = useState<boolean | null>(null)
  const [accountsTick, setAccountsTick] = useState(0)
  /** Bumps when URLs change so Socket.IO reconnects to the new origin. */
  const [socketGeneration, setSocketGeneration] = useState(0)
  /** True while the initial getAuthMe is in flight — prevents a duplicate foreground probe. */
  const initializingRef = useRef(true)

  const accounts = useMemo(() => {
    void accountsTick
    return listMobileAccounts()
  }, [accountsTick])

  const applySyncResult = useCallback((result: SyncServerUrlsResult): boolean => {
    if (!result.reachable) {
      setServerReachable(false)
      return false
    }
    saveServerProfile(result.server)
    saveConnection(result.connection)
    setConnection((prev) => connectionsEqual(prev, result.connection) ? prev : result.connection)
    setServerReachable(true)
    if (result.urlChanged) setSocketGeneration((n) => n + 1)
    return true
  }, [])

  const runServerSync = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    const storedRaw = loadConnection()
    if (!storedRaw || isConnectionExpired(storedRaw)) {
      return false
    }
    const stored = isStandaloneApp() ? repairStandaloneConnection(storedRaw) : storedRaw
    if (stored !== storedRaw) saveConnection(stored)
    if (isLoopbackApiBase(stored.apiBaseUrl) && !isStandaloneApp()) {
      return false
    }
    const result = await syncServerUrls(stored, loadServerProfile(), signal)
    return applySyncResult(result)
  }, [applySyncResult])

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
    const profile = serverProfileFromAuth(merged)
    const next = isStandaloneApp()
      ? repairStandaloneConnection(connectionFromAuth(merged))
      : connectionFromAuth(merged)
    saveServerProfile(
      isStandaloneApp() ? (repairStandaloneServerProfile(profile) ?? profile) : profile,
    )
    saveConnection(next)
    setConnection(next)
    setServerReachable(true)
    setAccountsTick((n) => n + 1)
    dispatchAppForeground()
  }, [])

  const refresh = useCallback(async () => {
    const stored = loadConnection()
    if (!stored || isConnectionExpired(stored)) {
      clearSession()
      setConnection(null)
      return false
    }

    if (isLoopbackApiBase(stored.apiBaseUrl) && !isStandaloneApp()) {
      clearSession()
      setConnection(null)
      return false
    }

    try {
      const me = await getAuthMe(stored)
      const next = connectionWithAuthMeUser(stored, me)
      saveConnection(next)
      setConnection((prev) => (connectionsEqual(prev, next) ? prev : next))
      setServerReachable(true)
      return true
    } catch (err) {
      if (isAuthFailure(err)) {
        clearSession()
        setConnection(null)
        setServerReachable(null)
        return false
      }
      if (
        isNetworkError(err) ||
        (err instanceof ApiError && isTransientUpstreamStatus(err.status))
      ) {
        const resolved = await resolveReachableServer(stored, loadServerProfile())
        if (resolved) {
          notifyIfPublicWebUrlChanged(stored.webUrl, resolved.server.webUrl)
          saveServerProfile(resolved.server)
          const next = applyServerEndpointsToConnection(stored, resolved.server)
          saveConnection(next)
          setConnection((prev) => (connectionsEqual(prev, next) ? prev : next))
          setServerReachable(true)
          dispatchAppForeground()
          try {
            const me = await getAuthMe(next)
            const verified = connectionWithAuthMeUser(next, me)
            saveConnection(verified)
            setConnection((prev) => (connectionsEqual(prev, verified) ? prev : verified))
          } catch {
            /* session still valid on new base; user refresh can retry */
          }
          return true
        }
        setConnection((prev) => connectionsEqual(prev, stored) ? prev : stored)
        setServerReachable(false)
        return false
      }
      setConnection((prev) => connectionsEqual(prev, stored) ? prev : stored)
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

    void (async () => {
      if (isStandaloneApp()) {
        try {
          await bootstrapStandaloneServerProfile()
        } catch {
          /* setup/sign-in surfaces errors */
        }
      }
    })()

    const storedRaw = loadConnection()

    if (!storedRaw || isConnectionExpired(storedRaw)) {
      clearSession()
      if (!cancelled) {
        setConnection(null)
        setReady(true)
      }
      return () => {
        cancelled = true
      }
    }

    const profile = isStandaloneApp() ? repairStandaloneServerProfile(loadServerProfile()) : loadServerProfile()
    if (profile && isStandaloneApp()) {
      saveServerProfile(profile)
    }

    const stored = isStandaloneApp() ? repairStandaloneConnection(storedRaw) : storedRaw
    if (stored !== storedRaw) {
      saveConnection(stored)
    }

    if (isLoopbackApiBase(stored.apiBaseUrl) && !isStandaloneApp()) {
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
      setServerReachable(true)
      setReady(true)
    }

    void (async () => {
      try {
        const me = await getAuthMe(stored)
        if (!cancelled) {
          const next = connectionWithAuthMeUser(stored, me)
          saveConnection(next)
          setConnection((prev) => (connectionsEqual(prev, next) ? prev : next))
          setServerReachable(true)
        }
      } catch (err) {
        if (!cancelled) {
          if (isAuthFailure(err)) {
            clearSession()
            setConnection(null)
            setServerReachable(null)
          } else if (
            isNetworkError(err) ||
            (err instanceof ApiError && isTransientUpstreamStatus(err.status))
          ) {
            const resolved = await resolveReachableServer(stored, loadServerProfile())
            if (!cancelled && resolved) {
              notifyIfPublicWebUrlChanged(stored.webUrl, resolved.server.webUrl)
              saveServerProfile(resolved.server)
              const next = applyServerEndpointsToConnection(stored, resolved.server)
              saveConnection(next)
              setConnection((prev) => connectionsEqual(prev, next) ? prev : next)
              setServerReachable(true)
              try {
                const me = await getAuthMe(next)
                if (!cancelled) {
                  const verified = connectionWithAuthMeUser(next, me)
                  saveConnection(verified)
                  setConnection((prev) => (connectionsEqual(prev, verified) ? prev : verified))
                }
              } catch {
                /* connected on new URL; profile refresh can retry */
              }
            } else if (!cancelled) {
              setServerReachable(false)
            }
          }
        }
      } finally {
        if (!cancelled) initializingRef.current = false
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
    setServerReachable(null)
  }, [])

  const forgetServer = useCallback(() => {
    clearSession()
    setConnection(null)
    setServerReachable(null)
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

    const storedRaw = connectionFromAccount(account)
    if (!storedRaw || isConnectionExpired(storedRaw)) {
      clearSession()
      setConnection(null)
      setAccountsTick((n) => n + 1)
      return false
    }

    const stored = isStandaloneApp() ? repairStandaloneConnection(storedRaw) : storedRaw
    if (stored !== storedRaw) {
      saveConnection(stored)
    }

    if (isLoopbackApiBase(stored.apiBaseUrl) && !isStandaloneApp()) {
      clearSession()
      setConnection(null)
      setAccountsTick((n) => n + 1)
      return false
    }

    setConnection(stored)
    try {
      const me = await getAuthMe(stored)
      const next = connectionWithAuthMeUser(stored, me)
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
      if (
        isNetworkError(err) ||
        (err instanceof ApiError && isTransientUpstreamStatus(err.status))
      ) {
        const resolved = await resolveReachableServer(stored, loadServerProfile())
        if (resolved) {
          notifyIfPublicWebUrlChanged(stored.webUrl, resolved.server.webUrl)
          saveServerProfile(resolved.server)
          const next = applyServerEndpointsToConnection(stored, resolved.server)
          saveConnection(next)
          setConnection(next)
          setServerReachable(true)
          setAccountsTick((n) => n + 1)
          dispatchAppForeground()
          try {
            const me = await getAuthMe(next)
            const verified = connectionWithAuthMeUser(next, me)
            saveConnection(verified)
            setConnection(verified)
          } catch {
            /* connected on new URL */
          }
          return true
        }
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

  /** Single in-flight probe — intervals, foreground and reconnect events all share it,
   *  so a stale slow probe can never overwrite the result of a newer successful one. */
  const reconnectInFlightRef = useRef<Promise<boolean> | null>(null)

  const tryAutoReconnect = useCallback(async (): Promise<boolean> => {
    if (reconnectInFlightRef.current) return reconnectInFlightRef.current

    const probe = (async () => {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 12_000)
      try {
        if (await refresh()) {
          dispatchAppForeground()
          await runServerSync(controller.signal)
          return true
        }
        const synced = await runServerSync(controller.signal)
        if (synced) {
          dispatchAppForeground()
          await refresh()
        }
        return synced
      } finally {
        window.clearTimeout(timer)
        reconnectInFlightRef.current = null
      }
    })()

    reconnectInFlightRef.current = probe
    return probe
  }, [refresh, runServerSync])

  const probeServerOnForeground = useCallback(async () => {
    if (initializingRef.current) return
    const ok = await tryAutoReconnect()
    if (ok) dispatchAppForeground()
  }, [tryAutoReconnect])

  useAppForeground(() => {
    void probeServerOnForeground()
  })

  useEffect(() => {
    const onReconnectNeeded = () => {
      setServerReachable(false)
      void tryAutoReconnect()
    }
    window.addEventListener(ARCIIN_RECONNECT_EVENT, onReconnectNeeded)
    return () => window.removeEventListener(ARCIIN_RECONNECT_EVENT, onReconnectNeeded)
  }, [tryAutoReconnect])

  useEffect(() => {
    if (!ready || !connection || serverReachable !== false) return
    void tryAutoReconnect()
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return
      void tryAutoReconnect()
    }, OFFLINE_RECONNECT_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [ready, connection?.sessionToken, serverReachable, tryAutoReconnect])

  useEffect(() => {
    if (!ready || !connection) return
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return
      void tryAutoReconnect()
    }, URL_SYNC_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [ready, connection?.sessionToken, tryAutoReconnect])

  useEffect(() => {
    let cancelled = false
    let socket: Socket | null = null
    let syncTimer: number | null = null

    const scheduleSync = () => {
      if (syncTimer !== null) window.clearTimeout(syncTimer)
      syncTimer = window.setTimeout(() => {
        void runServerSync().then((ok) => {
          if (ok) dispatchAppForeground()
        })
      }, 600)
    }

    void (async () => {
      const active = connection ?? loadConnection()
      if (!active || isConnectionExpired(active)) return

      const origin = await pickSocketOrigin(active, loadServerProfile())
      if (cancelled) return

      socket = io(origin, {
        path: "/socket.io",
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 8000,
        auth: { token: active.sessionToken },
        extraHeaders: { Authorization: `Bearer ${active.sessionToken}` },
      })

      const onUrlsUpdated = (event: SocketEventPayload) => {
        const data = event.data as
          | {
              apiBaseUrl?: string
              socketUrl?: string
              webUrl?: string
              instanceName?: string
              previousPublicUrl?: string | null
            }
          | undefined
        if (!data?.apiBaseUrl) return
        const current = loadConnection()
        if (!current || isConnectionExpired(current)) return

        const profile = loadServerProfile()
        const nextWebUrl = data.webUrl ?? data.apiBaseUrl.replace(/\/api\/?$/, "")
        const previousUrl =
          typeof data.previousPublicUrl === "string" ? data.previousPublicUrl : null

        notifyIfPublicWebUrlChanged(previousUrl ?? current.webUrl, nextWebUrl)

        const server = {
          apiBaseUrl: data.apiBaseUrl,
          socketUrl: data.socketUrl ?? data.apiBaseUrl.replace(/\/api\/?$/, ""),
          webUrl: nextWebUrl,
          instanceName: data.instanceName ?? profile?.instanceName ?? current.instanceName,
          instanceId: profile?.instanceId,
          canonicalPublicUrl: nextWebUrl,
          lanFallbackUrls: profile?.lanFallbackUrls,
        }
        saveServerProfile(server)
        const next = applyServerEndpointsToConnection(current, server)
        saveConnection(next)
        setConnection((prev) => connectionsEqual(prev, next) ? prev : next)
        setServerReachable(true)
        setSocketGeneration((n) => n + 1)
      }

      const onActivityCreated = (event: SocketEventPayload) => {
        const data = event.data as
          | {
              type?: string
              title?: string
              message?: string
              sentiment?: string
              client?: string
              fileName?: string
              destination?: string
            }
          | undefined
        const type = data?.type
        if (!type) return

        const isUploadEvent = type === "upload.completed" || type === "upload.failed"
        if (shouldSuppressMobileUploadNotice() && isUploadEvent) {
          return
        }

        const title = String(data?.title || event.message || "New activity")
        const message =
          data?.message != null
            ? String(data.message)
            : event.message
              ? String(event.message)
              : undefined

        notifyMobileActivityCreated({
          type,
          title,
          message,
          sentiment: data?.sentiment != null ? String(data.sentiment) : undefined,
        })

        // Visible toast — dispatchActivityCreatedEvent above only refreshes the
        // badge count. Without this, uploads from another device (or the
        // desktop app) never surface here until the user opens Notifications.
        if (isUploadEvent) {
          const fromOtherDevice = data?.client && data.client !== "mobile"
          const fileName = data?.fileName?.trim()
          if (type === "upload.completed") {
            mobileToast.success(
              fileName ? `${fileName} uploaded` : "Upload complete",
              data?.destination
                ? `Saved in ${data.destination}${fromOtherDevice ? " from another device" : ""}.`
                : fromOtherDevice
                  ? "Uploaded from another device."
                  : undefined,
            )
          } else {
            mobileToast.error(fileName ? `${fileName} failed to upload` : "Upload failed", message)
          }
        } else if (
          type.startsWith("security.") ||
          type.startsWith("auth.") ||
          type === "remote.public_url_changed"
        ) {
          mobileToast.warning(title, message)
        }
      }

      socket.on("instance.urls.updated", onUrlsUpdated)
      socket.on("activity.created", onActivityCreated)
      socket.on("disconnect", scheduleSync)
      socket.io.on("reconnect_failed", scheduleSync)
    })()

    return () => {
      cancelled = true
      if (syncTimer !== null) window.clearTimeout(syncTimer)
      if (socket) {
        socket.off("disconnect")
        socket.off("activity.created")
        socket.io.off("reconnect_failed")
        socket.disconnect()
      }
    }
  }, [connection?.sessionToken, connection?.apiBaseUrl, connection?.webUrl, socketGeneration, runServerSync])

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
