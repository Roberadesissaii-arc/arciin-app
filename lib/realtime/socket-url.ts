import type { MobileConnection } from "@/lib/types/api"

/**
 * Socket.IO entrypoint for the connected Arciin instance.
 * When the API is served as /api on the same host (tunnel or reverse proxy), use that
 * host so Socket.IO goes through the web proxy — not a bare :4000 port.
 */
export function getMobileSocketUrl(connection: MobileConnection): string {
  const apiBase = connection.apiBaseUrl.replace(/\/+$/, "")
  const web = (connection.webUrl || connection.socketUrl || apiBase).replace(/\/+$/, "")

  try {
    const api = new URL(apiBase)
    const webUrl = new URL(web)
    const sameHost = api.hostname === webUrl.hostname
    const apiOnSameOrigin =
      sameHost &&
      (api.pathname.startsWith("/api") || api.port === webUrl.port || !api.port)

    if (apiOnSameOrigin) {
      return webUrl.origin
    }
  } catch {
    // fall through
  }

  return web.replace(/\/+$/, "")
}
