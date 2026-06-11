import { normalizeApiBase } from "@/lib/connection/normalize-url"

function serverApiBaseUrl(): string {
  const apiUrl = process.env.ARCIIN_API_URL?.trim()
  if (apiUrl) {
    return normalizeApiBase(apiUrl.endsWith("/api") ? apiUrl : `${apiUrl.replace(/\/$/, "")}/api`)
  }
  const port = process.env.API_PORT?.trim() || "4000"
  return normalizeApiBase(`http://127.0.0.1:${port}/api`)
}

/**
 * API base for the co-located Arciin instance — same pattern as desktop:
 * browser calls `/api` on the PWA origin; Next rewrites to ARCIIN_API_URL.
 * Server-side code talks to ARCIIN_API_URL directly (not the public PWA URL).
 */
export function getStandaloneApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return normalizeApiBase(`${window.location.origin}/api`)
  }

  return serverApiBaseUrl()
}
