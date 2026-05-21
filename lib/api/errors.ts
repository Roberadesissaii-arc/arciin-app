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

export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return (
      err.code === "NETWORK_ERROR" ||
      err.code === "LAN_BLOCKED" ||
      err.code === "UPSTREAM_UNREACHABLE" ||
      err.status === 0
    )
  }
  if (err instanceof Error) {
    return /could not reach/i.test(err.message)
  }
  return false
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
  let body: ApiErrorBody | null = null
  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    /* ignore */
  }
  const code = body?.error?.code ?? "REQUEST_FAILED"
  const message =
    body?.error?.message ??
    (response.status === 0
      ? "Could not reach the server. Check the address and try again."
      : `Request failed (${response.status}).`)
  return new ApiError(response.status, code, message, body?.error?.details)
}
