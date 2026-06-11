import { fetchArciinProxiedWithBase } from "@/lib/api/proxy-fetch"
import { getBrowserApiBase, getBrowserApiUrl } from "@/lib/api/browser-api-origin"
import { lanBlockedFromHostedApp } from "@/lib/api/hosted-app"
import { needsArciinSameOriginProxy, resolveCoLocatedApiBase } from "@/lib/api/arciin-proxy"
import {
  ApiError,
  isNetworkError,
  isTransientUpstreamStatus,
  networkErrorMessage,
  parseApiError,
} from "@/lib/api/errors"
import { dispatchReconnectNeeded } from "@/lib/hooks/use-app-foreground"
import {
  deriveMobileServerUrlsFromApiBase,
  normalizeApiBase,
} from "@/lib/connection/normalize-url"
import { isLikelyMobilePwaUrl } from "@/lib/connection/mobile-pwa-origin"
import { isStandaloneApp } from "@/lib/standalone/config"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import type { MobileConnection } from "@/lib/types/api"

type FetchOptions = {
  method?: string
  body?: unknown | FormData
  signal?: AbortSignal
  connection?: MobileConnection | null
  /** Override API base (discover / pair before connection exists). */
  apiBaseUrl?: string
}

function isJsonBody(body: FetchOptions["body"]): body is Record<string, unknown> {
  if (body === undefined || body === null) return false
  if (typeof FormData !== "undefined" && body instanceof FormData) return false
  return typeof body === "object"
}

/** Resolved API URL for a path (always under …/api). */
export function buildApiUrl(apiBaseUrl: string, path: string): string {
  const base = normalizeApiBase(apiBaseUrl).replace(/\/+$/, "")
  const segment = path.startsWith("/") ? path : `/${path}`
  return `${base}${segment}`
}

export function apiBaseCandidates(
  primary: string,
  connection?: MobileConnection | null,
): string[] {
  if (typeof window !== "undefined" && isStandaloneApp()) {
    return [getStandaloneApiBaseUrl()]
  }

  const resolved =
    typeof window !== "undefined" ? resolveCoLocatedApiBase(primary) : primary
  const resolvedNorm = normalizeApiBase(resolved)
  const primaryNorm = normalizeApiBase(primary)

  if (typeof window !== "undefined" && resolvedNorm && resolvedNorm !== primaryNorm) {
    return [resolvedNorm]
  }

  const out = new Set<string>()
  if (resolvedNorm) out.add(resolvedNorm)

  try {
    const derived = deriveMobileServerUrlsFromApiBase(primary)
    if (derived.apiBaseUrl) out.add(normalizeApiBase(derived.apiBaseUrl))
    if (connection?.webUrl && !isLikelyMobilePwaUrl(connection.webUrl)) {
      out.add(normalizeApiBase(connection.webUrl))
    }
  } catch {
    /* keep primary */
  }

  return [...out]
}

function buildStandaloneFetchUrl(path: string): string {
  const segment = path.startsWith("/") ? path : `/${path}`
  const relativeBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/+$/, "")
  if (relativeBase.startsWith("http")) {
    return `${relativeBase}${segment}`
  }
  return `${relativeBase}${segment}`
}

async function fetchStandaloneApi<T>(
  path: string,
  options: FetchOptions,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (isJsonBody(options.body)) {
    headers["Content-Type"] = "application/json"
  }

  const token = options.connection?.sessionToken
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const method = options.method ?? (options.body !== undefined ? "POST" : "GET")
  const body =
    options.body === undefined
      ? undefined
      : isJsonBody(options.body)
        ? JSON.stringify(options.body)
        : (options.body as BodyInit)

  const url = buildStandaloneFetchUrl(path)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: options.signal,
      cache: "no-store",
      credentials: token ? "include" : "same-origin",
    })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the Arciin API. Check that arciin-api is running.",
    )
  }

  if (!response.ok) {
    const apiErr = await parseApiError(response)
    if (isTransientUpstreamStatus(apiErr.status) || isNetworkError(apiErr)) {
      dispatchReconnectNeeded()
    }
    throw apiErr
  }

  if (response.status === 204) {
    return undefined as T
  }

  const raw = await response.text()
  if (!raw.trim()) {
    return undefined as T
  }

  try {
    const json = JSON.parse(raw) as { data?: T }
    return json.data as T
  } catch {
    throw new ApiError(response.status, "INVALID_RESPONSE", "Server returned an invalid response.")
  }
}

export async function fetchApi<T>(path: string, options: FetchOptions = {}): Promise<T> {
  // Standalone co-located — same as desktop: relative /api on page origin (Next rewrite → API).
  if (typeof window !== "undefined" && isStandaloneApp()) {
    return fetchStandaloneApi<T>(path, options)
  }

  const rawInput =
    options.apiBaseUrl?.replace(/\/+$/, "") ??
    options.connection?.apiBaseUrl?.replace(/\/+$/, "")

  if (!rawInput) {
    throw new ApiError(0, "NO_SERVER", "No server configured.")
  }

  const rawBase = resolveCoLocatedApiBase(rawInput)

  if (!rawBase) {
    throw new ApiError(0, "NO_SERVER", "No server configured.")
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (isJsonBody(options.body)) {
    headers["Content-Type"] = "application/json"
  }

  const token = options.connection?.sessionToken
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const method = options.method ?? (options.body !== undefined ? "POST" : "GET")
  const body =
    options.body === undefined
      ? undefined
      : isJsonBody(options.body)
        ? JSON.stringify(options.body)
        : (options.body as BodyInit)

  const serverHint =
    options.apiBaseUrl ?? options.connection?.apiBaseUrl ?? options.connection?.webUrl

  let response: Response | null = null
  let lastFailed: Response | null = null

  const bases = apiBaseCandidates(rawBase, options.connection)
  let lanBlocked = false

  for (const base of bases) {
    if (lanBlockedFromHostedApp(base)) {
      lanBlocked = true
      continue
    }

    if (needsArciinSameOriginProxy(base)) {
      try {
        const data = await fetchArciinProxiedWithBase<T>(base, path, {
          connection: options.connection,
          method,
          body: options.body,
          signal: options.signal,
        })
        return data
      } catch (err) {
        if (err instanceof ApiError && err.code === "LAN_BLOCKED") {
          lanBlocked = true
          continue
        }
        if (err instanceof Error && err.name === "AbortError") {
          throw err
        }
        if (err instanceof ApiError) {
          throw err
        }
      }
      continue
    }

    const url = buildApiUrl(base, path)
    try {
      const attempt = await fetch(url, {
        method,
        headers,
        body,
        signal: options.signal,
        cache: "no-store",
        credentials: token ? "include" : "same-origin",
      })
      if (attempt.ok) {
        response = attempt
        break
      }
      lastFailed = attempt
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err
      }
    }
  }

  if (!response) {
    if (lanBlocked) {
      throw new ApiError(0, "LAN_BLOCKED", networkErrorMessage(serverHint))
    }
    if (lastFailed) {
      const apiErr = await parseApiError(lastFailed)
      if (isTransientUpstreamStatus(apiErr.status) || isNetworkError(apiErr)) {
        dispatchReconnectNeeded()
      }
      throw apiErr
    }
    throw new ApiError(0, "NETWORK_ERROR", networkErrorMessage(serverHint))
  }

  if (!response.ok) {
    const apiErr = await parseApiError(response)
    if (isTransientUpstreamStatus(apiErr.status) || isNetworkError(apiErr)) {
      dispatchReconnectNeeded()
    }
    throw apiErr
  }

  if (response.status === 204) {
    return undefined as T
  }

  const raw = await response.text()
  if (!raw.trim()) {
    return undefined as T
  }

  let json: { data?: T }
  try {
    json = JSON.parse(raw) as { data?: T }
  } catch {
    throw new ApiError(response.status, "INVALID_RESPONSE", "Server returned an invalid response.")
  }

  return json.data as T
}

/** Browser URL for uploads/SSE — exported for uploads.ts and chat.ts. */
export { getBrowserApiUrl, getBrowserApiBase }
