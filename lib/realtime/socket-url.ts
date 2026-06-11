import { isLikelyMobilePwaUrl, isMobileDevServerPort } from "@/lib/connection/mobile-pwa-origin"
import { isStandaloneApp } from "@/lib/standalone/config"
import type { MobileConnection } from "@/lib/types/api"

/**
 * Socket.IO entrypoint — same rule as desktop `getClientSocketUrl()`:
 * browser connects on the page origin; Next rewrites `/socket.io` to the API.
 */
export function getMobileSocketUrl(connection: MobileConnection): string {
  if (typeof window !== "undefined" && isStandaloneApp()) {
    return window.location.origin
  }

  const apiBase = connection.apiBaseUrl.replace(/\/+$/, "")

  try {
    const api = new URL(apiBase)
    const host = api.hostname
    const protocol = api.protocol

    if (
      typeof window !== "undefined" &&
      api.hostname === window.location.hostname &&
      api.pathname.replace(/\/+$/, "").endsWith("/api")
    ) {
      return window.location.origin
    }

    if (api.port === "4000") {
      return `${protocol}//${host}:4000`
    }

    const web = (connection.webUrl || connection.socketUrl || "").replace(/\/+$/, "")
    if (!web || isLikelyMobilePwaUrl(web)) {
      const socket = connection.socketUrl?.replace(/\/+$/, "")
      if (socket && !isLikelyMobilePwaUrl(socket)) return socket
      return `${protocol}//${host}:4000`
    }

    const webUrl = new URL(web)
    const sameHost = api.hostname === webUrl.hostname
    const apiOnSameOrigin =
      sameHost &&
      !isMobileDevServerPort(webUrl.port) &&
      (api.pathname.startsWith("/api") || api.port === webUrl.port || !api.port)

    if (apiOnSameOrigin) {
      return webUrl.origin
    }
  } catch {
    /* fall through */
  }

  const fallback = (connection.socketUrl || apiBase.replace(/\/api\/?$/i, "")).replace(/\/+$/, "")
  if (fallback && !isLikelyMobilePwaUrl(fallback)) return fallback
  return apiBase.replace(/\/api\/?$/i, "")
}
