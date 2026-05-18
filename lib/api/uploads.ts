import { ApiError, parseApiError } from "@/lib/api/errors"
import type { MobileConnection } from "@/lib/types/api"
import type { UploadSessionSummary } from "@/lib/types/assets"

type UploadOptions = {
  targetLibraryId?: string
  targetFolderId?: string
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export function uploadFile(connection: MobileConnection, file: File, options?: UploadOptions) {
  const base = connection.apiBaseUrl.replace(/\/+$/, "")
  const params = new URLSearchParams()
  // Never send target library unless explicitly set (server classifies by file type).
  if (options?.targetLibraryId?.trim()) {
    params.set("targetLibraryId", options.targetLibraryId.trim())
  }
  if (options?.targetFolderId?.trim()) {
    params.set("targetFolderId", options.targetFolderId.trim())
  }
  const url = `${base}/uploads${params.size ? `?${params.toString()}` : ""}`

  return new Promise<UploadSessionSummary>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)

    xhr.open("POST", url)
    xhr.setRequestHeader("Authorization", `Bearer ${connection.sessionToken}`)

    if (options?.signal) {
      if (options.signal.aborted) {
        reject(new ApiError(0, "UPLOAD_ABORTED", "Upload cancelled."))
        return
      }
      options.signal.addEventListener("abort", () => xhr.abort())
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        options?.onProgress?.(Math.round((event.loaded / event.total) * 100))
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
          reject(new ApiError(xhr.status, "INVALID_RESPONSE", "Upload response was invalid."))
          return
        }
      }
      void (async () => {
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

    xhr.onabort = () => {
      reject(new ApiError(0, "UPLOAD_ABORTED", "Upload cancelled."))
    }

    xhr.send(formData)
  })
}
