import type { UserPreferences } from "@/lib/types/models"

import { applyUserPreferences } from "@/lib/preferences/apply-user-preferences"
import { DEFAULT_USER_PREFERENCES } from "@/lib/preferences/defaults"

let active: UserPreferences = DEFAULT_USER_PREFERENCES
const listeners = new Set<() => void>()

export function getActiveUserPreferences() {
  return active
}

export function setActiveUserPreferences(next: UserPreferences) {
  active = next
  applyUserPreferences(next)
  for (const listener of listeners) listener()
}

export function subscribeUserPreferences(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function shouldPlayUploadSound() {
  return active.notifications.uploadSound
}
