import type { MobileConnection } from "@/lib/types/api"
import { loadServerProfile } from "@/lib/connection/storage"
import { isLikelyMobilePwaUrl } from "@/lib/connection/mobile-pwa-origin"

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "")
}

function addCandidate(list: string[], seen: Set<string>, raw?: string | null) {
  const value = raw?.trim()
  if (!value) return
  if (isLikelyMobilePwaUrl(value)) return

  if (typeof window !== "undefined") {
    try {
      if (new URL(value).origin === window.location.origin) return
    } catch {
      return
    }
  }

  try {
    const origin = stripTrailingSlash(new URL(value).origin)
    if (!seen.has(origin)) {
      seen.add(origin)
      list.push(origin)
    }
  } catch {
    /* ignore invalid URL */
  }
}

/**
 * Desktop web origin hosts /assets/icons (GitHub, AWS, model logos, etc.).
 * Mobile PWA webUrl is usually the phone shell — not where those assets live.
 */
export function resolveDesktopWebBaseForAssets(
  connection: Pick<MobileConnection, "apiBaseUrl" | "webUrl"> | null | undefined,
): string | null {
  const seen = new Set<string>()
  const candidates: string[] = []

  addCandidate(candidates, seen, process.env.NEXT_PUBLIC_ARCIIN_DESKTOP_WEB_URL)

  const profile = loadServerProfile()
  for (const url of profile?.lanFallbackUrls ?? []) {
    addCandidate(candidates, seen, url)
  }
  addCandidate(candidates, seen, profile?.canonicalPublicUrl)

  if (connection) {
    addCandidate(candidates, seen, connection.webUrl)

    try {
      const api = new URL(connection.apiBaseUrl)
      const { hostname, protocol } = api

      if (typeof window !== "undefined") {
        const mobilePort = Number.parseInt(window.location.port || "0", 10)
        if (Number.isFinite(mobilePort) && mobilePort > 1) {
          addCandidate(candidates, seen, `${protocol}//${hostname}:${mobilePort - 1}`)
        }
      }

      for (const port of ["3002", "3000", "3004"]) {
        addCandidate(candidates, seen, `${protocol}//${hostname}:${port}`)
      }
    } catch {
      /* ignore */
    }
  }

  return candidates[0] ?? null
}
