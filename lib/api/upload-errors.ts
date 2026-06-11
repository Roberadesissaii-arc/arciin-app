import { ApiError } from "@/lib/api/errors"

export type UploadUserMessage = {
  title: string
  detail: string
  retryable: boolean
  settingsAction?: boolean
}

export function uploadTooLargeMessage(): UploadUserMessage {
  return {
    title: "File too large",
    detail: "This file is bigger than your current upload limit. You can raise the limit in Settings.",
    retryable: false,
    settingsAction: true,
  }
}

export function formatUploadUserMessage(error: unknown): UploadUserMessage {
  if (error instanceof ApiError) {
    if (error.status === 413 || error.code === "UPLOAD_TOO_LARGE") {
      return uploadTooLargeMessage()
    }
    if (error.code === "NETWORK_ERROR" || error.status === 0) {
      return {
        title: "Upload failed",
        detail: "Could not reach your server. Check your connection and try again.",
        retryable: true,
      }
    }
    if (error.status === 403) {
      return {
        title: "Upload blocked",
        detail: "Your server rejected this upload. Check Security settings or try again later.",
        retryable: true,
      }
    }
    if (error.status === 429 || error.code === "RATE_LIMITED") {
      return {
        title: "Upload paused",
        detail: "Too many uploads at once. Wait a moment, then try again.",
        retryable: true,
      }
    }
    if (
      error.status === 500 &&
      /internal server error/i.test(error.message) &&
      !/size|limit|large/i.test(error.message)
    ) {
      return {
        title: "Upload failed",
        detail: "The server could not finish this upload. Try again or check that Arciin is running.",
        retryable: true,
      }
    }
    if (error.message.trim()) {
      return {
        title: "Upload failed",
        detail: error.message.trim(),
        retryable: true,
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      title: "Upload failed",
      detail: error.message.trim(),
      retryable: true,
    }
  }

  return {
    title: "Upload failed",
    detail: "Something went wrong. Check your connection and try again.",
    retryable: true,
  }
}

/** @deprecated Use formatUploadUserMessage for UI copy. */
export function formatUploadFailure(error: unknown, _maxUploadSizeMb?: number): string {
  const msg = formatUploadUserMessage(error)
  return `${msg.title}. ${msg.detail}`
}

export function fileExceedsUploadLimit(
  fileSizeBytes: number,
  maxUploadSizeMb: number,
): boolean {
  return fileSizeBytes > maxUploadSizeMb * 1024 * 1024
}
