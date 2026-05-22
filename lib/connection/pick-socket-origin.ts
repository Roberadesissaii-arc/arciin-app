import { fetchApi } from "@/lib/api/client"
import { isNetworkError } from "@/lib/api/errors"
import { deriveMobileServerUrlsFromApiBase } from "@/lib/connection/normalize-url"
import { getMobileSocketUrl } from "@/lib/realtime/socket-url"
import type { MobileServerProfile } from "@/lib/connection/storage"
import type { MobileConnection } from "@/lib/types/api"

async function probeApiBase(apiBaseUrl: string, timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    await fetchApi<{ status?: string }>("/health", {
      apiBaseUrl,
      signal: controller.signal,
    })
    return true
  } catch (err) {
    return !isNetworkError(err)
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * Prefer a reachable origin for Socket.IO — LAN first when the saved tunnel URL is dead.
 */
export async function pickSocketOrigin(
  connection: MobileConnection,
  profile: MobileServerProfile | null,
): Promise<string> {
  const seen = new Set<string>()
  const candidates: string[] = []

  const addApiBase = (raw: string | null | undefined) => {
    const t = raw?.trim()
    if (!t) return
    try {
      const urls = deriveMobileServerUrlsFromApiBase(
        t.includes("/api") ? t : `${t.replace(/\/+$/, "")}/api`,
      )
      const key = urls.apiBaseUrl
      if (seen.has(key)) return
      seen.add(key)
      const pseudo: MobileConnection = {
        ...connection,
        apiBaseUrl: urls.apiBaseUrl,
        webUrl: urls.webUrl,
        socketUrl: urls.socketUrl,
      }
      candidates.push(getMobileSocketUrl(pseudo))
    } catch {
      /* skip */
    }
  }

  for (const lan of profile?.lanFallbackUrls ?? []) {
    addApiBase(lan.includes("/api") ? lan : `${lan}/api`)
  }

  addApiBase(connection.apiBaseUrl)
  addApiBase(profile?.canonicalPublicUrl ? `${profile.canonicalPublicUrl}/api` : null)

  candidates.push(getMobileSocketUrl(connection))

  for (const origin of candidates) {
    const apiBase = `${origin.replace(/\/+$/, "")}/api`
    if (await probeApiBase(apiBase)) return origin
  }

  return getMobileSocketUrl(connection)
}
