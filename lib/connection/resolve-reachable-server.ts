import { fetchApi } from "@/lib/api/client"
import { isNetworkError } from "@/lib/api/errors"
import { discoverServer, getMobileServerEndpoints } from "@/lib/api/mobile"
import { isLoopbackApiBase, isPublicServerAddress } from "@/lib/connection/normalize-url"
import {
  serverProfileFromDiscover,
  serverProfileFromEndpoints,
} from "@/lib/connection/server-profile"
import type { MobileConnection } from "@/lib/types/api"
import type { MobileDiscoverResult } from "@/lib/types/api"
import type { MobileServerProfile } from "@/lib/connection/storage"

function discoverMatchesInstance(
  discover: MobileDiscoverResult,
  profile: Pick<MobileServerProfile, "instanceId" | "instanceName">,
): boolean {
  if (profile.instanceId && discover.instanceId) {
    return profile.instanceId === discover.instanceId
  }
  return discover.instanceName === profile.instanceName
}

async function probeHealth(apiBaseUrl: string, signal?: AbortSignal): Promise<boolean> {
  try {
    await fetchApi<{ status?: string }>("/health", { apiBaseUrl, signal })
    return true
  } catch (err) {
    return !isNetworkError(err)
  }
}

function candidateAddresses(
  connection: MobileConnection,
  profile: MobileServerProfile | null,
): string[] {
  const seen = new Set<string>()
  const add = (raw: string | null | undefined) => {
    const t = raw?.trim()
    if (!t) return
    seen.add(t)
  }

  add(connection.apiBaseUrl)
  add(connection.webUrl)
  add(profile?.apiBaseUrl)
  add(profile?.webUrl)

  if (profile?.canonicalPublicUrl) {
    add(profile.canonicalPublicUrl)
  }

  for (const lan of profile?.lanFallbackUrls ?? []) {
    add(lan)
  }

  return [...seen]
}

/**
 * When the saved tunnel URL died after a server restart, find the instance again
 * via LAN or the server's canonical public URL — without a new pairing code.
 */
export async function resolveReachableServer(
  connection: MobileConnection,
  profile: MobileServerProfile | null,
  signal?: AbortSignal,
): Promise<{ connection: MobileConnection; server: MobileServerProfile } | null> {
  if (isLoopbackApiBase(connection.apiBaseUrl)) return null

  const candidates = candidateAddresses(connection, profile)

  for (const address of candidates) {
    const apiBase = address.includes("/api")
      ? address
      : `${address.replace(/\/+$/, "")}/api`
    if (await probeHealth(apiBase, signal)) {
      return null
    }
  }

  for (const address of candidates) {
    try {
      const { discover, apiBaseUrl } = await discoverServer(address, signal)
      if (!discoverMatchesInstance(discover, {
        instanceId: profile?.instanceId,
        instanceName: profile?.instanceName ?? connection.instanceName,
      })) {
        continue
      }

      let server = serverProfileFromDiscover(discover, apiBaseUrl)

      const publicTry =
        discover.canonicalApiBaseUrl ??
        (discover.canonicalPublicUrl ? `${discover.canonicalPublicUrl.replace(/\/+$/, "")}/api` : null)

      let resolvedBase = apiBaseUrl
      if (publicTry && isPublicServerAddress(publicTry)) {
        if (await probeHealth(publicTry, signal)) {
          server = serverProfileFromDiscover(discover, publicTry)
          resolvedBase = server.apiBaseUrl
        }
      }

      let next: MobileConnection = {
        ...connection,
        apiBaseUrl: resolvedBase,
        socketUrl: server.socketUrl,
        webUrl: server.webUrl,
        instanceName: server.instanceName,
      }

      try {
        const canonical = await getMobileServerEndpoints(next, signal)
        if (canonical.apiBaseUrl) {
          server.instanceId = canonical.instanceId ?? server.instanceId
          const fromCanonical = serverProfileFromEndpoints(canonical.apiBaseUrl, {
            instanceName: canonical.instanceName,
            instanceId: canonical.instanceId,
            webUrl: canonical.webUrl,
            socketUrl: canonical.socketUrl,
            lanUrls: canonical.lanUrls,
            requestOrigin: canonical.requestOrigin,
          })
          Object.assign(server, fromCanonical)
          next = applyServerEndpointsToConnection(connection, server)
        }
      } catch {
        /* discover path is enough when /mobile/server is unreachable */
      }

      return { connection: next, server }
    } catch {
      continue
    }
  }

  if (connection.sessionToken) {
    for (const address of profile?.lanFallbackUrls ?? []) {
      try {
        const { discover, apiBaseUrl } = await discoverServer(address, signal)
        if (!discoverMatchesInstance(discover, {
          instanceId: profile?.instanceId,
          instanceName: profile?.instanceName ?? connection.instanceName,
        })) {
          continue
        }
        const server = serverProfileFromDiscover(discover, apiBaseUrl)
        const next: MobileConnection = {
          ...connection,
          apiBaseUrl,
          socketUrl: server.socketUrl,
          webUrl: server.webUrl,
          instanceName: server.instanceName,
        }
        return { connection: next, server }
      } catch {
        continue
      }
    }
  }

  return null
}

export function applyServerEndpointsToConnection(
  connection: MobileConnection,
  server: MobileServerProfile,
): MobileConnection {
  return {
    ...connection,
    apiBaseUrl: server.apiBaseUrl,
    socketUrl: server.socketUrl,
    webUrl: server.webUrl,
    instanceName: server.instanceName,
  }
}
