"use client"

import { useSyncExternalStore } from "react"

import { DEFAULT_USER_PREFERENCES } from "@/lib/preferences/defaults"
import {
  getActiveUserPreferences,
  subscribeUserPreferences,
} from "@/lib/preferences/preferences-store"

export function useActiveUserPreferences() {
  return useSyncExternalStore(
    subscribeUserPreferences,
    getActiveUserPreferences,
    () => DEFAULT_USER_PREFERENCES,
  )
}
