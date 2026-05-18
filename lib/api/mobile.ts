import { fetchApi } from "@/lib/api/client"
import {
  buildApiBaseCandidates,
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
    throw new Error("Enter a valid server address (e.g. 192.168.1.10 or http://192.168.1.10:4000).")
  }

  let lastError: Error | null = null

  for (const apiBaseUrl of candidates) {
    try {
      const discover = await fetchApi<MobileDiscoverResult>("/mobile/discover", {
        apiBaseUrl,
        signal,
      })
      if (discover.service !== "arciin") {
        lastError = new Error("This address is not an Arciin server.")
        continue
      }
      if (!discover.initialized) {
        throw new Error("This server has not been set up yet. Complete setup in the web app first.")
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
    }
  }

  throw lastError ?? new Error("Could not find an Arciin server at that address.")
}

export function pairMobileDevice(
  apiBaseUrl: string,
  body: {
    code: string
    email: string
    password: string
    deviceName?: string
  },
) {
  const normalizedCode = body.code.replace(/\D/g, "").slice(0, 6)
  return fetchApi<MobileAuthResult>("/mobile/pair", {
    apiBaseUrl,
    body: {
      code: normalizedCode,
      email: body.email.trim().toLowerCase(),
      password: body.password,
      deviceName: body.deviceName,
    },
  })
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
