import { getAuthMe } from "@/lib/api/auth"
import { ApiError, isNetworkError } from "@/lib/api/errors"
import { discoverServer } from "@/lib/api/mobile"
import { mobileAppWebOrigin } from "@/lib/connection/mobile-access-urls"
import { isSameOriginAsMobileApp } from "@/lib/connection/mobile-pwa-origin"
import {
  isLoopbackApiBase,
  isPrivateLanHostname,
  isTryCloudflareHostname,
} from "@/lib/connection/normalize-url"
import { serverProfileFromDiscover, serverProfileFromEndpoints } from "@/lib/connection/server-profile"
import { isStandaloneApp } from "@/lib/standalone/config"
import {
  clearSession,
  isConnectionExpired,
  loadConnection,
  loadServerProfile,
  saveConnection,
  saveServerProfile,
  type MobileServerProfile,
} from "@/lib/connection/storage"
import type { MobileConnection } from "@/lib/types/api"

export type ReconnectResult =
  | { status: "connected"; connection: MobileConnection }
  | { status: "need_sign_in"; server: MobileServerProfile }
  | { status: "invalid_server"; message: string }

/** Point this app at a new server address without clearing the saved server profile. */
export async function reconnectToServer(serverInput: string): Promise<ReconnectResult> {
  const trimmed = serverInput.trim()
  if (!trimmed) {
    return { status: "invalid_server", message: "Enter a server address." }
  }

  let apiBaseUrl: string
  let discovered: Awaited<ReturnType<typeof discoverServer>>
  try {
    discovered = await discoverServer(trimmed)
    apiBaseUrl = discovered.apiBaseUrl
  } catch (err) {
    return {
      status: "invalid_server",
      message: err instanceof Error ? err.message : "Could not reach that server.",
    }
  }

  if (isLoopbackApiBase(apiBaseUrl)) {
    return {
      status: "invalid_server",
      message: "That address points at this phone, not your Arciin server. Use your LAN IP or public URL.",
    }
  }

  let server = serverProfileFromDiscover(discovered.discover, apiBaseUrl)

  // Discover via proxy loses the real Host — keep the address the user chose.
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed.split("/")[0]}`
    const userUrl = new URL(withScheme)
    const userOrigin = userUrl.origin.replace(/\/+$/, "")
    const userPort = userUrl.port || (userUrl.protocol === "https:" ? "443" : "80")
    const preserveOrigin =
      userUrl.protocol === "https:" ||
      isTryCloudflareHostname(userUrl.hostname) ||
      (isPrivateLanHostname(userUrl.hostname) && userPort !== "4000" && userPort !== "4001")

    if (preserveOrigin) {
      server = serverProfileFromEndpoints(`${userOrigin}/api`, {
        instanceName: discovered.discover.instanceName,
        instanceId: discovered.discover.instanceId,
        webUrl: userOrigin,
        socketUrl: userOrigin,
        canonicalPublicUrl: discovered.discover.canonicalPublicUrl ?? userOrigin,
        lanUrls: discovered.discover.lanUrls,
        requestOrigin: userOrigin,
      })
    }
  } catch {
    /* keep discover profile */
  }

  if (isStandaloneApp() && isSameOriginAsMobileApp(trimmed)) {
    const origin = mobileAppWebOrigin()
    server = serverProfileFromEndpoints(`${origin}/api`, {
      instanceName: discovered.discover.instanceName,
      instanceId: discovered.discover.instanceId,
      webUrl: origin,
      socketUrl: origin,
      lanUrls: [origin],
      requestOrigin: origin,
      canonicalPublicUrl: discovered.discover.canonicalPublicUrl,
    })
  }

  saveServerProfile(server)

  const stored = loadConnection()
  if (!stored || isConnectionExpired(stored)) {
    return { status: "need_sign_in", server }
  }

  const next: MobileConnection = {
    ...stored,
    apiBaseUrl: server.apiBaseUrl,
    socketUrl: server.socketUrl,
    webUrl: server.webUrl,
    instanceName: server.instanceName,
  }

  const maxAuthAttempts = apiBaseUrl.startsWith("https://") ? 4 : 1
  let lastAuthErr: unknown = null

  for (let attempt = 0; attempt < maxAuthAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 800 * attempt))
    }
    try {
      const me = await getAuthMe(next)
      const connected = { ...next, user: me.user }
      saveConnection(connected)
      return { status: "connected", connection: connected }
    } catch (err) {
      lastAuthErr = err
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        break
      }
      if (!isNetworkError(err) || attempt >= maxAuthAttempts - 1) {
        break
      }
    }
  }

  const err = lastAuthErr
  if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
    clearSession()
    return { status: "need_sign_in", server }
  }
  if (isNetworkError(err)) {
    saveConnection(next)
    return {
      status: "invalid_server",
      message:
        "Server address saved, but this phone still cannot reach it. Check the URL, tunnel, or Wi‑Fi.",
    }
  }
  return {
    status: "invalid_server",
    message: err instanceof Error ? err.message : "Could not verify your session on the new address.",
  }
}

export function serverAddressFromProfile(): string {
  const profile = loadServerProfile()
  if (!profile) return ""
  return profile.webUrl ?? profile.apiBaseUrl.replace(/\/api\/?$/i, "")
}
