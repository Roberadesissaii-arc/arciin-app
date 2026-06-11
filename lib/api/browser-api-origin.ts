/**
 * Browser API URLs for co-located standalone mobile — same rules as desktop
 * (`arciin/lib/api/browser-api-origin.ts`): credentialed calls use the page
 * origin `/api` so Next rewrites to ARCIIN_API_URL (never :4000 from the phone).
 */

function configuredApiOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_ARCIIN_API_ORIGIN?.trim()
  if (!raw) return null
  return raw.replace(/\/$/, "")
}

function normalizeApiPath(path: string): string {
  const trimmed = path.replace(/^\//, "")
  return trimmed.startsWith("api/") ? `/${trimmed}` : `/api/${trimmed}`
}

/** Page origin for browser API calls, or null during SSR. */
export function getBrowserApiOrigin(): string | null {
  if (typeof window === "undefined") return null

  const configured = configuredApiOrigin()
  if (configured) {
    try {
      const apiUrl = new URL(configured.includes("://") ? configured : `http://${configured}`)
      if (apiUrl.host === window.location.host) {
        return apiUrl.origin
      }
    } catch {
      /* use page origin */
    }
  }

  return window.location.origin
}

/** Full URL for browser API requests (uploads, SSE chat, media, etc.). */
export function getBrowserApiUrl(path: string): string {
  const apiPath = normalizeApiPath(path)
  const browserOrigin = getBrowserApiOrigin()
  if (browserOrigin) {
    return `${browserOrigin}${apiPath}`
  }

  const configured = configuredApiOrigin()
  if (configured) {
    try {
      const base = new URL(configured.includes("://") ? configured : `http://${configured}`)
      return `${base.origin}${apiPath}`
    } catch {
      /* fall through */
    }
  }

  const publicBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/$/, "")
  if (publicBase.startsWith("http")) {
    return `${publicBase}${apiPath.replace(/^\/api/, "")}`
  }

  return apiPath
}

/** Relative or absolute JSON API base (…/api) for fetchApi in standalone mode. */
export function getBrowserApiBase(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`
  }
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/$/, "") || "/api"
}
