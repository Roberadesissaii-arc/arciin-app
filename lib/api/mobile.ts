import { fetchApi } from "@/lib/api/client"
import { isNetworkError } from "@/lib/api/errors"
import {
  buildApiBaseCandidates,
  isPublicServerAddress,
  normalizeApiBase,
  resolveClientApiBaseUrl,
} from "@/lib/connection/normalize-url"
import type {
  MobileAuthResult,
  MobileConnection,
  MobileDiscoverResult,
} from "@/lib/types/api"

export async function discoverServer(
  serverInput: string,
  signal?: AbortSignal,
): Promise<{ discover: MobileDiscoverResult; apiBaseUrl: string }> {
  const candidates = buildApiBaseCandidates(serverInput)
  if (candidates.length === 0) {
    throw new Error(
      "Enter a valid address — LAN IP (192.168.1.10) or public URL (https://your-domain.com).",
    )
  }

  let lastError: Error | null = null

  const maxAttempts = 3

  for (const apiBaseUrl of candidates) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 600 * attempt))
      }
      try {
        const discover = await fetchApi<MobileDiscoverResult>("/mobile/discover", {
          apiBaseUrl,
          signal,
        })
        if (discover.service !== "arciin") {
          lastError = new Error("This address is not an Arciin server.")
          break
        }
        if (!discover.initialized) {
          throw new Error(
            "This server has not been set up yet. Complete setup in the web app first.",
          )
        }
        return {
          discover,
          apiBaseUrl: resolveClientApiBaseUrl(apiBaseUrl, {
            serverAdvertised: discover.apiBaseUrl,
            requestOrigin: discover.requestOrigin,
          }),
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (!isNetworkError(err) || attempt >= maxAttempts - 1) break
      }
    }
  }

  const hint = serverInput.trim()
  throw (
    lastError ??
    new Error(
      isPublicServerAddress(hint)
        ? "Could not find Arciin at that URL. Check the address, tunnel, and that the server is running."
        : "Could not find Arciin on your network. Check the IP address and that you are on the same Wi‑Fi.",
    )
  )
}

export async function pairMobileDevice(
  apiBaseUrl: string,
  body: {
    code: string
    email: string
    password: string
    deviceName?: string
  },
  signal?: AbortSignal,
) {
  const normalizedCode = body.code.replace(/\D/g, "").slice(0, 6)
  const payload = {
    code: normalizedCode,
    email: body.email.trim().toLowerCase(),
    password: body.password,
    deviceName: body.deviceName,
  }

  const bases = [...new Set([apiBaseUrl, ...buildApiBaseCandidates(apiBaseUrl)].map(normalizeApiBase).filter(Boolean))]

  let lastError: Error | null = null
  for (const base of bases) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 400))
      try {
        return await fetchApi<MobileAuthResult>("/mobile/pair", {
          apiBaseUrl: base,
          body: payload,
          signal,
        })
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (!isNetworkError(err)) throw lastError
      }
    }
  }

  throw lastError ?? new Error("Could not pair with this server.")
}

export function loginMobileDevice(
  connection: Pick<MobileConnection, "apiBaseUrl">,
  body: { email: string; password: string; deviceName?: string },
) {
  return fetchApi<MobileAuthResult>("/mobile/login", {
    apiBaseUrl: connection.apiBaseUrl,
    body: {
      email: body.email.trim().toLowerCase(),
      password: body.password,
      deviceName: body.deviceName,
    },
  })
}

export function verifyPairingCode(apiBaseUrl: string, code: string) {
  return fetchApi<{ valid: boolean; instanceName: string }>("/mobile/pair/verify", {
    apiBaseUrl,
    body: { code: code.replace(/\D/g, "").slice(0, 6) },
  })
}
