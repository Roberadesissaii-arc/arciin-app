"use client"

import { useConnection } from "@/components/providers/connection-provider"
import type { MobileConnection } from "@/lib/types/api"

/** True only after a live reachability check succeeded — not while probing or offline. */
export function isServerConnected(serverReachable: boolean | null): boolean {
  return serverReachable === true
}

/** Greeting / identity copy before the server is confirmed online. */
export const PLACEHOLDER_GREETING = "Hi there 👋"

export function homeGreeting(
  connection: MobileConnection | null,
  serverReachable: boolean | null,
): string {
  if (!isServerConnected(serverReachable)) return PLACEHOLDER_GREETING
  const first = connection?.user.name?.split(/\s+/)[0]
  if (first) return `Hi, ${first}`
  return "Overview"
}

export function homeSubtitle(
  connection: MobileConnection | null,
  serverReachable: boolean | null,
): string {
  if (serverReachable === false) {
    return "Your server is offline — reconnect to refresh this overview."
  }
  if (!isServerConnected(serverReachable)) {
    return "Connecting to your server…"
  }
  return connection?.instanceName
    ? `${connection.instanceName} at a glance`
    : "Your Arciin instance at a glance."
}

export function profileDisplayName(
  user: MobileConnection["user"] | undefined,
  serverReachable: boolean | null,
): string {
  if (!isServerConnected(serverReachable)) return "Your profile"
  return user?.name?.trim() || "—"
}

export function profileDisplayEmail(
  user: MobileConnection["user"] | undefined,
  serverReachable: boolean | null,
): string | null {
  if (!isServerConnected(serverReachable)) return null
  return user?.email?.trim() || null
}

/** Matches `formatApiError` / `networkErrorMessage` offline copy. */
export function isConnectionUnreachableMessage(error: string | null | undefined): boolean {
  if (!error) return false
  return /could not reach/i.test(error)
}

/**
 * Hide per-page fetch errors when the shell offline banner should own the UX.
 */
export function suppressFetchErrorWhenOffline(
  serverReachable: boolean | null,
  error: string | null,
): string | null {
  if (!error) return null
  if (serverReachable === false) return null
  if (serverReachable !== true && isConnectionUnreachableMessage(error)) return null
  if (isConnectionUnreachableMessage(error)) return null
  return error
}

/** Whether a page should render its own red inline alert (not shell offline). */
export function shouldShowPageFetchError(
  serverReachable: boolean | null,
  error: string | null,
): boolean {
  return suppressFetchErrorWhenOffline(serverReachable, error) !== null
}

export function useServerOnline() {
  const { connection, ready, serverReachable, refresh } = useConnection()
  const serverOnline = Boolean(ready && connection && serverReachable !== false)
  return { connection, ready, serverReachable, serverOnline, refresh }
}

/** Neutral composer hint — never duplicate the top offline banner with red API errors. */
export function chatComposerFooterNote(input: {
  serverOnline: boolean
  profilesLoading: boolean
  streaming: boolean
  hasModel: boolean
  activityNote?: string
}): string {
  const { serverOnline, profilesLoading, streaming, hasModel, activityNote } = input
  if (!serverOnline) return "Server disconnected"
  if (profilesLoading) return "Loading models…"
  if (streaming && activityNote) return activityNote
  if (!hasModel) return "No AI model configured — open Models"
  if (streaming) return activityNote ?? "Generating…"
  return "Messages are sent to your Arciin server"
}

export function chatComposerPlaceholder(input: {
  serverOnline: boolean
  profilesLoading: boolean
  streaming: boolean
  hasModel: boolean
}): string {
  const { serverOnline, profilesLoading, streaming, hasModel } = input
  if (!serverOnline) return "Server disconnected"
  if (streaming) return "Generating… tap Stop to interrupt"
  if (profilesLoading) return "Loading…"
  if (!hasModel) return "No AI model configured"
  return "Ask anything…"
}
