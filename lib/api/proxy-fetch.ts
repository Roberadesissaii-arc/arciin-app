import {
  ARCIIN_API_BASE_HEADER,
  arciinProxyHeaders,
  needsArciinSameOriginProxy,
} from "@/lib/api/arciin-proxy"
import { lanBlockedFromHostedApp } from "@/lib/api/hosted-app"
import { ApiError, parseApiError } from "@/lib/api/errors"
import { normalizeApiBase } from "@/lib/connection/normalize-url"
import type { MobileConnection } from "@/lib/types/api"

/** Same-origin proxy for JSON API calls when the PWA origin ≠ Arciin API (e.g. Vercel → home server). */
export async function fetchArciinProxiedWithBase<T>(
  apiBaseUrl: string,
  apiPath: string,
  options: {
    connection?: MobileConnection | null
    method?: string
    body?: unknown
    signal?: AbortSignal
  } = {},
): Promise<T> {
  if (lanBlockedFromHostedApp(apiBaseUrl)) {
    throw new ApiError(0, "LAN_BLOCKED", "LAN addresses do not work from this app install.")
  }

  const segment = apiPath.replace(/^\//, "")
  const url = `/api/arciin/${segment}`
  const headers: Record<string, string> = {
    Accept: "application/json",
    [ARCIIN_API_BASE_HEADER]: normalizeApiBase(apiBaseUrl).replace(/\/+$/, ""),
  }

  if (options.connection?.sessionToken) {
    headers.Authorization = `Bearer ${options.connection.sessionToken}`
  }

  const method = options.method ?? (options.body !== undefined ? "POST" : "GET")
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: "no-store",
    credentials: "same-origin",
  })

  if (!res.ok) {
    throw await parseApiError(res)
  }

  if (res.status === 204) {
    return undefined as T
  }

  const raw = await res.text()
  if (!raw.trim()) {
    return undefined as T
  }

  const json = JSON.parse(raw) as { data?: T }
  return json.data as T
}

export async function fetchArciinProxied<T>(
  connection: MobileConnection,
  apiPath: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  return fetchArciinProxiedWithBase<T>(connection.apiBaseUrl, apiPath, {
    ...options,
    connection,
  })
}

export function shouldUseArciinProxy(connection: MobileConnection): boolean {
  return needsArciinSameOriginProxy(connection.apiBaseUrl)
}
