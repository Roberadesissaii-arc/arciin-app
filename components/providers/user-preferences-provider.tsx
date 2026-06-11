"use client"

import { useEffect, useLayoutEffect } from "react"

import { useConnection } from "@/components/providers/connection-provider"
import { getUserPreferences } from "@/lib/api/user-preferences"
import {
  applyUserPreferences,
  applyUserPreferencesDefaults,
} from "@/lib/preferences/apply-user-preferences"
import {
  getActiveUserPreferences,
  setActiveUserPreferences,
} from "@/lib/preferences/preferences-store"

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { connection, ready } = useConnection()

  useLayoutEffect(() => {
    applyUserPreferences(getActiveUserPreferences())
  }, [])

  useEffect(() => {
    if (!ready) return
    if (!connection) {
      applyUserPreferencesDefaults()
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const prefs = await getUserPreferences(connection)
        if (!cancelled) setActiveUserPreferences(prefs)
      } catch {
        if (!cancelled) applyUserPreferencesDefaults()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [ready, connection?.sessionToken])

  return <>{children}</>
}
