import type { MobileAuthResult, MobileDiscoverResult } from "@/lib/types/api"
import type { MobileServerProfile } from "@/lib/connection/storage"
import { deriveMobileServerUrlsFromApiBase } from "@/lib/connection/normalize-url"
import { isLikelyMobilePwaUrl } from "@/lib/connection/mobile-pwa-origin"

function mergeLanUrls(
  lanUrls: string[] | undefined,
  requestOrigin: string | null | undefined,
  webUrl: string,
): string[] {
  const set = new Set<string>()
  for (const u of lanUrls ?? []) {
    if (u?.trim() && !isLikelyMobilePwaUrl(u)) set.add(u.replace(/\/+$/, ""))
  }
  if (requestOrigin?.trim() && !isLikelyMobilePwaUrl(requestOrigin)) {
    set.add(requestOrigin.replace(/\/+$/, ""))
  }
  if (webUrl?.trim() && !isLikelyMobilePwaUrl(webUrl)) set.add(webUrl.replace(/\/+$/, ""))
  return [...set]
}

export function serverProfileFromEndpoints(
  apiBaseUrl: string,
  meta: {
    instanceName: string
    instanceId?: string | null
    canonicalPublicUrl?: string | null
    lanUrls?: string[]
    requestOrigin?: string | null
    webUrl?: string
    socketUrl?: string
  },
): MobileServerProfile {
  const urls = deriveMobileServerUrlsFromApiBase(apiBaseUrl)
  const webUrl = meta.webUrl ?? urls.webUrl
  return {
    apiBaseUrl: urls.apiBaseUrl,
    socketUrl: meta.socketUrl ?? urls.socketUrl,
    webUrl,
    instanceName: meta.instanceName,
    instanceId: meta.instanceId ?? undefined,
    canonicalPublicUrl: meta.canonicalPublicUrl?.replace(/\/+$/, "") ?? undefined,
    lanFallbackUrls: mergeLanUrls(meta.lanUrls, meta.requestOrigin, webUrl),
  }
}

export function serverProfileFromAuth(auth: MobileAuthResult): MobileServerProfile {
  return serverProfileFromEndpoints(auth.server.apiBaseUrl, {
    instanceName: auth.server.instanceName,
    instanceId: auth.server.instanceId,
    canonicalPublicUrl: auth.server.canonicalPublicUrl,
    lanUrls: auth.server.lanUrls,
    requestOrigin: auth.server.requestOrigin,
    webUrl: auth.server.webUrl,
    socketUrl: auth.server.socketUrl,
  })
}

export function serverProfileFromDiscover(
  discover: MobileDiscoverResult,
  apiBaseUrl: string,
): MobileServerProfile {
  return serverProfileFromEndpoints(apiBaseUrl, {
    instanceName: discover.instanceName,
    instanceId: discover.instanceId,
    canonicalPublicUrl: discover.canonicalPublicUrl,
    lanUrls: discover.lanUrls,
    requestOrigin: discover.requestOrigin,
    webUrl: discover.webUrl,
    socketUrl: discover.socketUrl,
  })
}
