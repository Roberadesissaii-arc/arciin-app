import {
  isLoopbackApiBase,
  isPrivateLanHostname,
  normalizeApiBase,
} from "@/lib/connection/normalize-url"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import { isStandaloneApp } from "@/lib/standalone/config"
import type { MobileConnection } from "@/lib/types/api"

/** Sent to same-origin Next.js routes that proxy to the user’s Arciin instance. */
export const ARCIIN_API_BASE_HEADER = "x-arciin-api-base"

function isCoLocatedApiHost(hostname: string): boolean {
  if (typeof window === "undefined") return false
  const pageHost = window.location.hostname.toLowerCase()
  const apiHost = hostname.toLowerCase()
  if (apiHost === pageHost) return true
  if (isLoopbackApiBase(`http://${apiHost}/api`)) return true
  return isPrivateLanHostname(apiHost) && isPrivateLanHostname(pageHost)
}

/**
 * Co-located standalone mobile: API is reached via `/api` on the PWA origin (Next rewrite),
 * not :4000 directly and not `/api/arciin/*` (that path is rewritten upstream and 404s).
 */
export function resolveCoLocatedApiBase(apiBaseUrl: string): string {
  if (typeof window === "undefined") return apiBaseUrl

  if (isStandaloneApp()) {
    return getStandaloneApiBaseUrl()
  }

  const normalized = normalizeApiBase(apiBaseUrl)
  if (!normalized) return apiBaseUrl
  try {
    const api = new URL(normalized)
    if (isCoLocatedApiHost(api.hostname)) {
      return normalizeApiBase(`${window.location.origin}/api`)
    }
  } catch {
    return apiBaseUrl
  }
  return apiBaseUrl
}

/** True when the PWA runs on a different origin than the Arciin API (e.g. Vercel → home server). */
export function needsArciinSameOriginProxy(apiBaseUrl: string): boolean {
  if (typeof window === "undefined") return false
  if (isStandaloneApp()) return false
  try {
    const resolved = resolveCoLocatedApiBase(apiBaseUrl)
    const apiOrigin = new URL(normalizeApiBase(resolved)).origin
    return window.location.origin !== apiOrigin
  } catch {
    return true
  }
}

export function arciinProxyHeaders(connection: MobileConnection): Record<string, string> {
  return {
    Authorization: `Bearer ${connection.sessionToken}`,
    [ARCIIN_API_BASE_HEADER]: connection.apiBaseUrl.replace(/\/+$/, ""),
  }
}
