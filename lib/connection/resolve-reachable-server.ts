import { isPwaHostedApp } from "@/lib/api/hosted-app"
import { fetchApi } from "@/lib/api/client"
import { isNetworkError } from "@/lib/api/errors"
import { discoverServer, getMobileServerEndpoints } from "@/lib/api/mobile"
import {
  isLoopbackApiBase,
  isPrivateLanHostname,
  isPublicServerAddress,
  isTryCloudflareHostname,
} from "@/lib/connection/normalize-url"
import {
  serverProfileFromDiscover,
  serverProfileFromEndpoints,
} from "@/lib/connection/server-profile"
import type { MobileConnection } from "@/lib/types/api"
import type { MobileDiscoverResult } from "@/lib/types/api"
import type { MobileServerProfile } from "@/lib/connection/storage"
import { isStandaloneApp } from "@/lib/standalone/config"
import { repairStandaloneConnection } from "@/lib/standalone/repair-server-urls"

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

/** LAN first so a dead trycloudflare URL does not block rediscovery on Wi‑Fi. */
function discoverAddressesInOrder(
  connection: MobileConnection,
  profile: MobileServerProfile | null,
): string[] {
  const lan: string[] = []
  const other: string[] = []
  const seen = new Set<string>()

  const add = (raw: string | null | undefined, bucket: "lan" | "other") => {
    const t = raw?.trim().replace(/\/+$/, "")
    if (!t || seen.has(t)) return
    seen.add(t)
    let host = t
    try {
      host = new URL(/^https?:\/\//i.test(t) ? t : `http://${t}`).hostname
    } catch {
      /* keep t */
    }
    const isLan =
      bucket === "lan" ||
      isPrivateLanHostname(host) ||
      (!isPublicServerAddress(t) && !isTryCloudflareHostname(host))
    if (isLan) lan.push(t)
    else other.push(t)
  }

  for (const u of profile?.lanFallbackUrls ?? []) add(u, "lan")

  const maybeLan = [profile?.webUrl, connection.webUrl]
  for (const u of maybeLan) {
    if (!u?.trim()) continue
    let host = u
    try {
      host = new URL(/^https?:\/\//i.test(u) ? u : `http://${u}`).hostname
    } catch {
      /* keep u */
    }
    add(u, isPrivateLanHostname(host) && !isTryCloudflareHostname(host) ? "lan" : "other")
  }

  add(profile?.canonicalPublicUrl, "other")
  add(connection.apiBaseUrl, "other")
  add(profile?.apiBaseUrl, "other")

  const ordered = [...lan, ...other]
  if (!isPwaHostedApp()) return ordered

  return ordered.filter((raw) => {
    try {
      const host = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`).hostname
      return !isPrivateLanHostname(host)
    } catch {
      return true
    }
  })
}

async function resolveFromDiscover(
  connection: MobileConnection,
  profile: MobileServerProfile | null,
  address: string,
  signal?: AbortSignal,
): Promise<{ connection: MobileConnection; server: MobileServerProfile } | null> {
  const { discover, apiBaseUrl } = await discoverServer(address, signal)
  if (
    !discoverMatchesInstance(discover, {
      instanceId: profile?.instanceId,
      instanceName: profile?.instanceName ?? connection.instanceName,
    })
  ) {
    return null
  }

  let server = serverProfileFromDiscover(discover, apiBaseUrl)
  let resolvedBase = apiBaseUrl

  const publicTry =
    discover.canonicalApiBaseUrl ??
    (discover.canonicalPublicUrl
      ? `${discover.canonicalPublicUrl.replace(/\/+$/, "")}/api`
      : null)

  if (publicTry && isPublicServerAddress(publicTry) && (await probeHealth(publicTry, signal))) {
    server = serverProfileFromDiscover(discover, publicTry)
    resolvedBase = server.apiBaseUrl
  } else if (!(await probeHealth(resolvedBase, signal))) {
    return null
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
    if (canonical.apiBaseUrl && (await probeHealth(canonical.apiBaseUrl, signal))) {
      server = serverProfileFromEndpoints(canonical.apiBaseUrl, {
        instanceName: canonical.instanceName,
        instanceId: canonical.instanceId,
        webUrl: canonical.webUrl,
        socketUrl: canonical.socketUrl,
        lanUrls: canonical.lanUrls,
        requestOrigin: canonical.requestOrigin,
      })
      next = applyServerEndpointsToConnection(connection, server)
    }
  } catch {
    /* LAN discover already returned fresh canonicalPublicUrl when on Wi‑Fi */
  }

  return { connection: next, server }
}

/**
 * When the saved tunnel URL died after a server restart, find the instance again
 * via LAN (then canonical public URL from discover) — without a new pairing code.
 */
export async function resolveReachableServer(
  connection: MobileConnection,
  profile: MobileServerProfile | null,
  signal?: AbortSignal,
): Promise<{ connection: MobileConnection; server: MobileServerProfile } | null> {
  if (isLoopbackApiBase(connection.apiBaseUrl)) return null

  const addresses = discoverAddressesInOrder(connection, profile)

  for (const address of addresses) {
    try {
      const resolved = await resolveFromDiscover(connection, profile, address, signal)
      if (resolved) return resolved
    } catch {
      continue
    }
  }

  return null
}

export function applyServerEndpointsToConnection(
  connection: MobileConnection,
  server: MobileServerProfile,
): MobileConnection {
  const next: MobileConnection = {
    ...connection,
    apiBaseUrl: server.apiBaseUrl,
    socketUrl: server.socketUrl,
    webUrl: server.webUrl,
    instanceName: server.instanceName,
  }
  return isStandaloneApp() ? repairStandaloneConnection(next) : next
}
