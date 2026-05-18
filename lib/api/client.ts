import { ApiError, parseApiError } from "@/lib/api/errors"
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

export async function fetchApi<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const apiBase =
    options.apiBaseUrl?.replace(/\/+$/, "") ??
    options.connection?.apiBaseUrl?.replace(/\/+$/, "")

  if (!apiBase) {
    throw new ApiError(0, "NO_SERVER", "No server configured.")
  }

  const url = `${apiBase}${path.startsWith("/") ? path : `/${path}`}`
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

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body:
        options.body === undefined
          ? undefined
          : isJsonBody(options.body)
            ? JSON.stringify(options.body)
            : (options.body as BodyInit),
      signal: options.signal,
      cache: "no-store",
    })
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Could not reach the server. Check the address and that you are on the same network.",
    )
  }

  if (!response.ok) {
    throw await parseApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const json = (await response.json()) as { data: T }
  return json.data
}
