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
import {
  clearConnection,
  connectionFromAuth,
  isConnectionExpired,
  loadConnection,
  saveConnection,
} from "@/lib/connection/storage"
import type { MobileConnection } from "@/lib/types/api"
import type { MobileAuthResult } from "@/lib/types/api"

type ConnectionContextValue = {
  connection: MobileConnection | null
  ready: boolean
  refresh: () => Promise<boolean>
  applyAuth: (auth: MobileAuthResult) => void
  updateUser: (user: MobileConnection["user"]) => void
  signOut: () => void
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<MobileConnection | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const stored = loadConnection()
    if (!stored || isConnectionExpired(stored)) {
      clearConnection()
      setConnection(null)
      return false
    }

    try {
      await getAuthMe(stored)
      setConnection(stored)
      return true
    } catch {
      clearConnection()
      setConnection(null)
      return false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = loadConnection()
      if (!stored || isConnectionExpired(stored)) {
        clearConnection()
        if (!cancelled) {
          setConnection(null)
          setReady(true)
        }
        return
      }
      try {
        await getAuthMe(stored)
        if (!cancelled) setConnection(stored)
      } catch {
        clearConnection()
        if (!cancelled) setConnection(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const applyAuth = useCallback((auth: MobileAuthResult) => {
    const next = connectionFromAuth(auth)
    saveConnection(next)
    setConnection(next)
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
    clearConnection()
    setConnection(null)
  }, [])

  const value = useMemo(
    () => ({
      connection,
      ready,
      refresh,
      applyAuth,
      updateUser,
      signOut,
    }),
    [connection, ready, refresh, applyAuth, updateUser, signOut],
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
