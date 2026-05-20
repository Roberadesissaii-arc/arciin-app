import { normalizeApiBase } from "@/lib/connection/normalize-url"
import type { MobileConnection } from "@/lib/types/api"

/** Sent to same-origin Next.js routes that proxy to the user’s Arciin instance. */
export const ARCIIN_API_BASE_HEADER = "x-arciin-api-base"

/** True when the PWA runs on a different origin than the Arciin API (e.g. Vercel → home server). */
export function needsArciinSameOriginProxy(apiBaseUrl: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const apiOrigin = new URL(normalizeApiBase(apiBaseUrl)).origin
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
