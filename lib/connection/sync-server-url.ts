import { getMobileServerEndpoints } from "@/lib/api/mobile"
import { fetchApi } from "@/lib/api/client"
import { ApiError, isNetworkError, isTransientUpstreamStatus } from "@/lib/api/errors"
import { isLoopbackApiBase } from "@/lib/connection/normalize-url"
import { notifyIfPublicWebUrlChanged } from "@/lib/connection/notify-url-change"
import {
  applyServerEndpointsToConnection,
  resolveReachableServer,
} from "@/lib/connection/resolve-reachable-server"
import { serverProfileFromEndpoints } from "@/lib/connection/server-profile"
import type { MobileServerProfile } from "@/lib/connection/storage"
import type { MobileConnection } from "@/lib/types/api"
import { isStandaloneApp } from "@/lib/standalone/config"
import {
  repairStandaloneConnection,
  repairStandaloneServerProfile,
} from "@/lib/standalone/repair-server-urls"

async function probeHealth(apiBaseUrl: string, signal?: AbortSignal): Promise<boolean> {
  try {
    await fetchApi<{ status?: string }>("/health", { apiBaseUrl, signal })
    return true
  } catch (err) {
    if (err instanceof ApiError && isTransientUpstreamStatus(err.status)) {
      return false
    }
    return !isNetworkError(err)
  }
}

function urlsChanged(
  current: MobileConnection,
  next: Pick<MobileServerProfile, "apiBaseUrl" | "webUrl" | "socketUrl">,
): boolean {
  const norm = (s: string) => s.replace(/\/+$/, "")
  return (
    norm(current.apiBaseUrl) !== norm(next.apiBaseUrl) ||
    norm(current.webUrl) !== norm(next.webUrl) ||
    norm(current.socketUrl) !== norm(next.socketUrl)
  )
}

export type SyncServerUrlsResult =
  | {
      reachable: true
      connection: MobileConnection
      server: MobileServerProfile
      urlChanged: boolean
    }
  | { reachable: false }

/**
 * Keep the phone on the latest Arciin URLs without re-pairing.
 * 1. Probe saved API base.
 * 2. If up, refresh from GET /mobile/server (canonical tunnel may have rotated).
 * 3. If down, rediscover via LAN fallbacks + discover (same instance id).
 */
export async function syncServerUrls(
  connection: MobileConnection,
  profile: MobileServerProfile | null,
  signal?: AbortSignal,
): Promise<SyncServerUrlsResult> {
  if (isLoopbackApiBase(connection.apiBaseUrl)) {
    if (isStandaloneApp()) {
      connection = repairStandaloneConnection(connection)
    } else {
      return { reachable: false }
    }
  }

  const healthOk = await probeHealth(connection.apiBaseUrl, signal)

  if (healthOk) {
    try {
      const endpoints = await getMobileServerEndpoints(connection, signal)
      const server = serverProfileFromEndpoints(endpoints.apiBaseUrl, {
        instanceName: endpoints.instanceName,
        instanceId: endpoints.instanceId,
        webUrl: endpoints.webUrl,
        socketUrl: endpoints.socketUrl,
        lanUrls: endpoints.lanUrls,
        requestOrigin: endpoints.requestOrigin,
        canonicalPublicUrl: endpoints.webUrl,
      })
      const nextConnection = applyServerEndpointsToConnection(connection, server)
      const nextServer = isStandaloneApp()
        ? repairStandaloneServerProfile(server) ?? server
        : server
      const changed = urlsChanged(connection, nextConnection)
      if (changed) {
        notifyIfPublicWebUrlChanged(connection.webUrl, nextServer.webUrl)
      }
      return {
        reachable: true,
        connection: nextConnection,
        server: nextServer,
        urlChanged: changed,
      }
    } catch (err) {
      if (!isNetworkError(err)) {
        return {
          reachable: true,
          connection,
          server:
            profile ??
            ({
              apiBaseUrl: connection.apiBaseUrl,
              socketUrl: connection.socketUrl,
              webUrl: connection.webUrl,
              instanceName: connection.instanceName,
            } satisfies MobileServerProfile),
          urlChanged: false,
        }
      }
      /* Session or network glitch — try LAN / discover fallbacks below. */
    }
  }

  const resolved = await resolveReachableServer(connection, profile, signal)
  if (!resolved) return { reachable: false }

  const changed = urlsChanged(connection, resolved.server)
  if (changed) {
    notifyIfPublicWebUrlChanged(connection.webUrl, resolved.server.webUrl)
  }

  return {
    reachable: true,
    connection: resolved.connection,
    server: resolved.server,
    urlChanged: changed,
  }
}
