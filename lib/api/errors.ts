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

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
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
      ? "Could not reach the server. Check the address and Wi‑Fi."
      : `Request failed (${response.status}).`)
  return new ApiError(response.status, code, message, body?.error?.details)
}
