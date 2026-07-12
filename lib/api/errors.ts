import { HOSTED_APP_LAN_HINT, isPwaHostedApp } from "@/lib/api/hosted-app"
import { isPublicServerAddress } from "@/lib/connection/normalize-url"
import { loadServerProfile } from "@/lib/connection/storage"
import type { ApiErrorBody } from "@/lib/types/api"

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export function serverAddressHint(serverAddress?: string | null): string | null {
  const profile = loadServerProfile()
  return (
    serverAddress?.trim() ||
    profile?.webUrl?.trim() ||
    profile?.apiBaseUrl?.trim() ||
    null
  )
}

export function networkErrorMessage(serverAddress?: string | null): string {
  const hint = serverAddressHint(serverAddress)
  const retry =
    "If you just restarted Arciin, wait a few seconds and try again — paste the new public URL from desktop Settings → Domain."

  if (isPwaHostedApp() && hint && !isPublicServerAddress(hint)) {
    return HOSTED_APP_LAN_HINT
  }

  if (isPwaHostedApp()) {
    return `Could not reach your Arciin server. Check the public HTTPS address in Settings → Domain, then try again. ${retry}`
  }

  if (isPublicServerAddress(hint)) {
    return `Could not reach your Arciin server. Check the URL, tunnel, or reverse proxy is running and Arciin is online. ${retry}`
  }

  return `Could not reach your Arciin server. Confirm Arciin is running and this phone is on the same Wi‑Fi as the server. ${retry}`
}

/** Cloudflare / reverse-proxy / tunnel errors — server may be up on a different URL. */
export function isTransientUpstreamStatus(status: number): boolean {
  return (
    status === 0 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 530 ||
    (status >= 520 && status <= 524)
  )
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return (
      err.code === "NETWORK_ERROR" ||
      err.code === "LAN_BLOCKED" ||
      err.code === "UPSTREAM_UNREACHABLE" ||
      err.status === 0 ||
      isTransientUpstreamStatus(err.status)
    )
  }
  if (err instanceof Error) {
    return /could not reach/i.test(err.message)
  }
  return false
}

/** Plan-gated feature (vault, AI automation, …) — the server's plan does not include it. */
export function isLicenseRequiredError(err: unknown): boolean {
  return err instanceof ApiError && err.code === "LICENSE_REQUIRED"
}

/** First plan that unlocks the gated feature (e.g. "pro"), from LICENSE_REQUIRED details. */
export function licenseRequiredPlan(err: unknown): string | null {
  if (!isLicenseRequiredError(err)) return null
  const details = (err as ApiError).details as { requiredPlans?: string[] } | undefined
  return details?.requiredPlans?.[0] ?? null
}

/** User-facing copy for chat stream / provider failures (Ollama, model missing, etc.). */
export function formatChatProviderError(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return "Chat failed. Try again or pick a different model."

  if (/choose an ollama model/i.test(trimmed)) return trimmed

  if (/model.*not found|pull.*model|does not exist/i.test(trimmed)) {
    return `${trimmed} Tap the boxes icon below and choose a model installed on your Arciin server.`
  }

  if (/ollama cloud rejected|api key/i.test(trimmed)) return trimmed

  if (/could not verify ollama cloud/i.test(trimmed)) {
    return `${trimmed} Add or rotate your key under Models → Ollama Cloud.`
  }

  if (/empty response body from ollama/i.test(trimmed)) {
    return "Ollama returned an empty reply. Check that Ollama is running on your Arciin server and the model is installed."
  }

  if (/provider error|ollama/i.test(trimmed)) return trimmed

  return trimmed
}

export function formatApiError(err: unknown, serverAddress?: string | null): string {
  if (err instanceof ApiError) {
    if (err.code === "INVALID_PAIRING_CODE") {
      return err.message
    }
    if (err.code === "INVALID_CREDENTIALS") {
      return err.message
    }
    if (err.code === "LAN_BLOCKED" || err.code === "NETWORK_ERROR" || err.status === 0) {
      return networkErrorMessage(serverAddress)
    }
    if (err.code === "UPSTREAM_UNREACHABLE") {
      return networkErrorMessage(serverAddress)
    }
    if (isTransientUpstreamStatus(err.status)) {
      return networkErrorMessage(serverAddress)
    }
    if (err.code === "LICENSE_REQUIRED") {
      // Plan gate, not a permissions problem — surface the server's upgrade message.
      return err.message
    }
    if (err.code === "FORBIDDEN" || err.status === 403) {
      return "You do not have permission for this action. API keys require an Owner or Admin account."
    }
    return err.message
  }
  if (err instanceof Error) {
    if (/could not reach/i.test(err.message)) {
      return networkErrorMessage(serverAddress)
    }
    return err.message
  }
  return "Something went wrong. Try again."
}

export async function parseApiError(response: Response): Promise<ApiError> {
  const raw = await response.text()
  let body: ApiErrorBody | null = null
  try {
    body = raw ? (JSON.parse(raw) as ApiErrorBody) : null
  } catch {
    /* non-JSON — often a Next.js HTML error page when /api rewrite misses */
  }
  const code = body?.error?.code ?? "REQUEST_FAILED"
  let message = body?.error?.message
  if (!message) {
    if (response.status === 0 || isTransientUpstreamStatus(response.status)) {
      message = networkErrorMessage()
    } else if (response.status === 404 && /could not be found|not found/i.test(raw)) {
      message =
        "Setup API route not found. Confirm Arciin Mobile is running (pm2 status arciin-mobile) and the API is online — not the desktop web app on the same port."
    } else {
      message = `Request failed (${response.status}).`
    }
  }
  return new ApiError(response.status, code, message, body?.error?.details)
}
