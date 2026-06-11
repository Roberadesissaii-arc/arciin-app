import { deriveMobileServerUrlsFromApiBase } from "@/lib/connection/normalize-url"
import { isLikelyMobilePwaUrl } from "@/lib/connection/mobile-pwa-origin"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import type { MobileConnection } from "@/lib/types/api"
import type { MobileServerProfile } from "@/lib/connection/storage"

function standaloneClientUrls() {
  return deriveMobileServerUrlsFromApiBase(getStandaloneApiBaseUrl())
}

/** Fix sessions saved with loopback, :4000, or other non-PWA API bases. */
export function repairStandaloneConnection(connection: MobileConnection): MobileConnection {
  if (typeof window === "undefined") return connection

  const urls = standaloneClientUrls()
  if (
    connection.apiBaseUrl === urls.apiBaseUrl &&
    connection.webUrl === urls.webUrl &&
    connection.socketUrl === urls.socketUrl
  ) {
    return connection
  }

  return {
    ...connection,
    apiBaseUrl: urls.apiBaseUrl,
    webUrl: urls.webUrl,
    socketUrl: urls.socketUrl ?? connection.socketUrl,
  }
}

export function repairStandaloneServerProfile(
  profile: MobileServerProfile | null,
): MobileServerProfile | null {
  if (!profile) return null
  const urls = standaloneClientUrls()
  const lan = (profile.lanFallbackUrls ?? []).filter((u) => !isLikelyMobilePwaUrl(u))

  return {
    ...profile,
    apiBaseUrl: urls.apiBaseUrl,
    webUrl: urls.webUrl,
    socketUrl: urls.socketUrl,
    lanFallbackUrls: lan,
  }
}
