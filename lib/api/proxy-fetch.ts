import {
  arciinProxyHeaders,
  needsArciinSameOriginProxy,
} from "@/lib/api/arciin-proxy"
import { ApiError, parseApiError } from "@/lib/api/errors"
import type { MobileConnection } from "@/lib/types/api"

/** Same-origin proxy for JSON API calls when the PWA origin ≠ Arciin API (e.g. Vercel → home server). */
export async function fetchArciinProxied<T>(
  connection: MobileConnection,
  apiPath: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const segment = apiPath.replace(/^\//, "")
  const url = `/api/arciin/${segment}`
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...arciinProxyHeaders(connection),
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

export function shouldUseArciinProxy(connection: MobileConnection): boolean {
  return needsArciinSameOriginProxy(connection.apiBaseUrl)
}
