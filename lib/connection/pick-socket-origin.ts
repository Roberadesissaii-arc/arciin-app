import { resolveCoLocatedApiBase } from "@/lib/api/arciin-proxy"
import { fetchApi } from "@/lib/api/client"
import { isStandaloneApp } from "@/lib/standalone/config"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import { isNetworkError } from "@/lib/api/errors"
import { isLikelyMobilePwaUrl } from "@/lib/connection/mobile-pwa-origin"
import { deriveMobileServerUrlsFromApiBase, normalizeApiBase } from "@/lib/connection/normalize-url"
import { getMobileSocketUrl } from "@/lib/realtime/socket-url"
import type { MobileServerProfile } from "@/lib/connection/storage"
import type { MobileConnection } from "@/lib/types/api"

async function probeApiBase(
  apiBaseUrl: string,
  connection: MobileConnection,
  timeoutMs = 4000,
): Promise<boolean> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    await fetchApi<{ status?: string }>("/health", {
      apiBaseUrl: normalizeApiBase(apiBaseUrl),
      connection,
      signal: controller.signal,
    })
    return true
  } catch (err) {
    return !isNetworkError(err)
  } finally {
    window.clearTimeout(timer)
  }
}

function addApiBaseCandidate(seen: Set<string>, out: string[], raw: string | null | undefined) {
  const trimmed = raw?.trim()
  if (!trimmed || isLikelyMobilePwaUrl(trimmed)) return
  const base = normalizeApiBase(trimmed.includes("/api") ? trimmed : `${trimmed.replace(/\/+$/, "")}/api`)
  if (!base || seen.has(base) || isLikelyMobilePwaUrl(base)) return
  seen.add(base)
  out.push(base)
}

/**
 * Prefer a reachable origin for Socket.IO — probes real Arciin API bases, not the mobile PWA.
 */
export async function pickSocketOrigin(
  connection: MobileConnection,
  profile: MobileServerProfile | null,
): Promise<string> {
  if (typeof window !== "undefined") {
    if (isStandaloneApp()) {
      return deriveMobileServerUrlsFromApiBase(getStandaloneApiBaseUrl()).socketUrl
    }
    const coLocated = resolveCoLocatedApiBase(connection.apiBaseUrl)
    try {
      if (new URL(coLocated).hostname === window.location.hostname) {
        return deriveMobileServerUrlsFromApiBase(coLocated).socketUrl
      }
    } catch {
      /* probe fallbacks */
    }
  }

  const seen = new Set<string>()
  const apiBases: string[] = []

  for (const lan of profile?.lanFallbackUrls ?? []) {
    addApiBaseCandidate(seen, apiBases, lan)
  }

  addApiBaseCandidate(seen, apiBases, connection.apiBaseUrl)
  addApiBaseCandidate(
    seen,
    apiBases,
    profile?.canonicalPublicUrl ? `${profile.canonicalPublicUrl}/api` : null,
  )

  for (const apiBase of apiBases) {
    if (await probeApiBase(apiBase, connection)) {
      return deriveMobileServerUrlsFromApiBase(apiBase).socketUrl
    }
  }

  return getMobileSocketUrl(connection)
}
