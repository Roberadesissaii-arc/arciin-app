import { fetchApi } from "@/lib/api/client"
import { ApiError, isNetworkError } from "@/lib/api/errors"

/** Ping `/health` without a session — true when the host responds. */
export async function probeServerReachable(
  apiBaseUrl: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    await fetchApi<{ status?: string }>("/health", { apiBaseUrl, signal })
    return true
  } catch (err) {
    if (isNetworkError(err)) return false
    if (err instanceof ApiError && err.status > 0) return true
    return false
  }
}
