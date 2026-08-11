import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"

/**
 * Short-lived, single-asset tokens for media URLs.
 *
 * A `<video>` src cannot carry an Authorization header, so whatever authorises
 * it sits in the query string — visible in browser history, in a Referer, and
 * in any link the user shares from the player. That used to be the account's
 * session token, which the API accepts on every authenticated route, so one
 * shared video link handed over the whole account.
 *
 * These are scoped to one asset and expire in minutes.
 */

type Scope = "stream" | "download"

type CachedToken = { token: string; expiresAtMs: number }

const cache = new Map<string, CachedToken>()
const inflight = new Map<string, Promise<string | null>>()

/** Re-mint this far before expiry so playback never trips over the boundary. */
const REFRESH_MARGIN_MS = 60_000

function keyOf(assetId: string, scope: Scope): string {
  return `${assetId}:${scope}`
}

/** Drop a token after a 401 so the next request mints a fresh one. */
export function invalidateMediaToken(assetId: string, scope: Scope = "stream"): void {
  cache.delete(keyOf(assetId, scope))
}

export function clearMediaTokens(): void {
  cache.clear()
  inflight.clear()
}

/**
 * Returns null when minting fails. Callers fall back to the legacy query auth
 * rather than showing a broken player — this is a hardening step, and it must
 * not be able to take media offline on its own.
 */
export async function getMediaToken(
  connection: MobileConnection,
  assetId: string,
  scope: Scope = "stream",
): Promise<string | null> {
  const key = keyOf(assetId, scope)

  const hit = cache.get(key)
  if (hit && hit.expiresAtMs - REFRESH_MARGIN_MS > Date.now()) {
    return hit.token
  }

  // Collapse concurrent requests for the same asset — a grid or a player that
  // re-renders would otherwise mint several tokens for one file.
  const pending = inflight.get(key)
  if (pending) return pending

  const request = (async () => {
    try {
      const res = await fetchApi<{ token: string; expiresAt: string }>(
        `/assets/${encodeURIComponent(assetId)}/media-token`,
        { method: "POST", body: { scope }, connection },
      )
      if (!res?.token) return null
      cache.set(key, {
        token: res.token,
        expiresAtMs: new Date(res.expiresAt).getTime(),
      })
      return res.token
    } catch {
      return null
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, request)
  return request
}
