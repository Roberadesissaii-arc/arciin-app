import { getBrowserApiUrl } from "@/lib/api/browser-api-origin"
import { ApiError, parseApiError } from "@/lib/api/errors"
import {
  ARCIIN_API_BASE_HEADER,
  ARCIIN_CLIENT_CHANNEL_HEADER,
  ARCIIN_MOBILE_CLIENT_CHANNEL,
  needsArciinSameOriginProxy,
  resolveCoLocatedApiBase,
} from "@/lib/api/arciin-proxy"
import { isStandaloneApp } from "@/lib/standalone/config"
import { normalizeApiBase } from "@/lib/connection/normalize-url"
import { sleep } from "@/lib/uploads/sleep"
import type { MobileConnection } from "@/lib/types/api"
import type { UploadSessionSummary } from "@/lib/types/assets"

type UploadOptions = {
  targetLibraryId?: string
  targetFolderId?: string
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

function buildUploadRequest(connection: MobileConnection, params: URLSearchParams) {
  const query = params.size ? `?${params.toString()}` : ""
  const authHeader = { Authorization: `Bearer ${connection.sessionToken}` }
  const clientHeader = { [ARCIIN_CLIENT_CHANNEL_HEADER]: ARCIIN_MOBILE_CLIENT_CHANNEL }

  if (typeof window !== "undefined" && isStandaloneApp()) {
    return {
      url: getBrowserApiUrl(`/uploads${query}`),
      headers: { ...authHeader, ...clientHeader },
    }
  }

  const apiBase = resolveCoLocatedApiBase(connection.apiBaseUrl)
  const directUrl = `${apiBase.replace(/\/+$/, "")}/uploads${query}`

  if (typeof window === "undefined" || !needsArciinSameOriginProxy(apiBase)) {
    return { url: directUrl, headers: { ...authHeader, ...clientHeader } }
  }

  return {
    url: `/api/arciin/uploads${query}`,
    headers: {
      ...authHeader,
      ...clientHeader,
      [ARCIIN_API_BASE_HEADER]: normalizeApiBase(connection.apiBaseUrl).replace(/\/+$/, ""),
    },
  }
}

function retryDelayMs(error: ApiError, attempt: number): number {
  if (error.status === 429) {
    const details = error.details as { retryAfterSeconds?: number } | undefined
    const sec = details?.retryAfterSeconds
    if (typeof sec === "number" && sec > 0) return sec * 1000
    return 15_000
  }
  return Math.min(30_000, 1_500 * 2 ** attempt)
}

function isRetryableUploadError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  if (error.code === "UPLOAD_ABORTED") return false
  if (error.code === "UPLOAD_TOO_LARGE") return false
  if (error.status === 413) return false
  if (error.status === 429) return true
  if (error.code === "NETWORK_ERROR") return true
  if (error.status === 502 || error.status === 503 || error.status === 504) return true
  return false
}

function uploadFileOnce(
  connection: MobileConnection,
  file: File,
  options?: UploadOptions,
): Promise<UploadSessionSummary> {
  const params = new URLSearchParams()
  if (options?.targetLibraryId?.trim()) {
    params.set("targetLibraryId", options.targetLibraryId.trim())
  }
  if (options?.targetFolderId?.trim()) {
    params.set("targetFolderId", options.targetFolderId.trim())
  }

  const { url, headers } = buildUploadRequest(connection, params)

  return new Promise<UploadSessionSummary>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)

    xhr.open("POST", url)
    xhr.timeout = 0
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }

    if (options?.signal) {
      if (options.signal.aborted) {
        reject(new ApiError(0, "UPLOAD_ABORTED", "Upload cancelled."))
        return
      }
      options.signal.addEventListener("abort", () => xhr.abort())
    }

    xhr.upload.addEventListener("loadstart", () => {
      options?.onProgress?.(1)
    })

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        options?.onProgress?.(Math.max(1, Math.round((event.loaded / event.total) * 100)))
        return
      }
      if (event.loaded > 0) {
        options?.onProgress?.(1)
      }
    })

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const payload = JSON.parse(xhr.responseText) as { data?: UploadSessionSummary }
          if (payload.data) {
            options?.onProgress?.(100)
            resolve(payload.data)
            return
          }
        } catch {
          /* fall through to INVALID_RESPONSE below */
        }
        reject(new ApiError(xhr.status, "INVALID_RESPONSE", "Upload response was invalid."))
        return
      }

      void (async () => {
        if (xhr.status === 0) {
          reject(new ApiError(0, "NETWORK_ERROR", "Upload failed — could not reach the server."))
          return
        }
        reject(
          await parseApiError(
            new Response(xhr.responseText, {
              status: xhr.status,
              headers: { "Content-Type": "application/json" },
            }),
          ),
        )
      })()
    }

    xhr.onerror = () => {
      reject(new ApiError(0, "NETWORK_ERROR", "Could not upload. Check your connection."))
    }

    xhr.ontimeout = () => {
      reject(new ApiError(0, "NETWORK_ERROR", "Upload timed out — try again with the app in the foreground."))
    }

    xhr.onabort = () => {
      reject(new ApiError(0, "UPLOAD_ABORTED", "Upload cancelled."))
    }

    xhr.send(formData)
  })
}

export async function uploadFile(
  connection: MobileConnection,
  file: File,
  options?: UploadOptions,
) {
  const maxAttempts = 5
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await uploadFileOnce(connection, file, options)
    } catch (error) {
      lastError = error
      if (!isRetryableUploadError(error) || attempt === maxAttempts - 1) {
        throw error
      }
      await sleep(retryDelayMs(error as ApiError, attempt))
    }
  }

  throw lastError
}
