import { deriveMobileServerUrlsFromApiBase, isLoopbackApiBase } from "@/lib/connection/normalize-url"
import type { MobileAuthResult } from "@/lib/types/api"

/**
 * The API returns URLs from server env (often localhost). The phone must keep the
 * LAN address it actually used to reach the server.
 */
export function authWithClientApiBase(
  auth: MobileAuthResult,
  clientApiBase: string,
): MobileAuthResult {
  const urls = deriveMobileServerUrlsFromApiBase(clientApiBase)
  return {
    ...auth,
    server: {
      ...auth.server,
      ...urls,
      instanceName: auth.server.instanceName ?? "Arciin",
    },
  }
}

export function pickClientApiBase(
  requestApiBase: string,
  auth: MobileAuthResult,
  savedApiBase?: string | null,
): string {
  if (!isLoopbackApiBase(requestApiBase)) return requestApiBase
  if (savedApiBase && !isLoopbackApiBase(savedApiBase)) return savedApiBase
  return requestApiBase
}
