import { assetFileFromBlob, canShareFiles } from "@/lib/api/asset-binary"
import {
  getAssetBlob,
  getReadyAssetBlob,
} from "@/lib/api/asset-blob-cache"
import { assetFilesViewUrl } from "@/lib/api/asset-media-urls"
import type { MobileConnection } from "@/lib/types/api"
import type { AssetSummary } from "@/lib/types/assets"

export type ShareAssetResult = "shared_file" | "shared_link" | "copied" | "cancelled"
export type DownloadAssetResult = "saved" | "opened_tab" | "cancelled"

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError"
}

function isIosLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

function triggerAnchorDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

/** iOS fallback when the share sheet cannot be opened after async work. */
function openBlobForManualSave(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob)
  const opened = window.open(objectUrl, "_blank", "noopener,noreferrer")
  if (!opened) {
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.target = "_blank"
    anchor.rel = "noopener noreferrer"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
}

function shareFilesFromGesture(
  asset: AssetSummary,
  blob: Blob,
  title: string,
): Promise<ShareAssetResult> {
  const file = assetFileFromBlob(asset, blob)
  if (!canShareFiles([file])) {
    return Promise.reject(new Error("File share is not supported on this device."))
  }
  return navigator
    .share({ files: [file], title })
    .then(() => "shared_file" as const)
}

async function shareFileAfterFetch(
  connection: MobileConnection,
  asset: AssetSummary,
  title: string,
  viewUrl: string,
): Promise<ShareAssetResult> {
  const ready = getReadyAssetBlob(connection, asset.id)
  const blob = ready ?? (await getAssetBlob(connection, asset.id))
  const file = assetFileFromBlob(asset, blob)

  if (canShareFiles([file])) {
    try {
      await navigator.share({ files: [file], title })
      return "shared_file"
    } catch (err) {
      if (isAbortError(err)) return "cancelled"
    }
  }

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text: title, url: viewUrl })
      return "shared_link"
    } catch (err) {
      if (isAbortError(err)) return "cancelled"
    }
  }

  try {
    await navigator.clipboard.writeText(viewUrl)
    return "copied"
  } catch {
    if (isIosLikeDevice()) {
      openBlobForManualSave(blob)
      throw new Error("Opened the file in a new tab — use the share icon there to save or send it.")
    }
    throw new Error("Could not share this file on this device.")
  }
}

/**
 * Share from a tap handler. Avoids awaiting network I/O before the first
 * `navigator.share` call so iOS keeps the user-gesture context.
 */
export function beginShareAsset(
  connection: MobileConnection,
  asset: AssetSummary,
): Promise<ShareAssetResult> {
  const title = asset.title?.trim() || asset.originalFilename
  const viewUrl = assetFilesViewUrl(asset.id)
  const ready = getReadyAssetBlob(connection, asset.id)

  if (ready) {
    return shareFilesFromGesture(asset, ready, title).catch((err) => {
      if (isAbortError(err)) return "cancelled" as const
      if (typeof navigator.share === "function") {
        return navigator
          .share({ title, url: viewUrl })
          .then(() => "shared_link" as const)
          .catch((linkErr) => {
            if (isAbortError(linkErr)) return "cancelled" as const
            return shareFileAfterFetch(connection, asset, title, viewUrl)
          })
      }
      return shareFileAfterFetch(connection, asset, title, viewUrl)
    })
  }

  if (typeof navigator.share === "function") {
    return navigator
      .share({ title, url: viewUrl })
      .then(() => "shared_link" as const)
      .catch((err) => {
        if (isAbortError(err)) return "cancelled" as const
        return shareFileAfterFetch(connection, asset, title, viewUrl)
      })
  }

  return shareFileAfterFetch(connection, asset, title, viewUrl)
}

/** @deprecated Use beginShareAsset from tap handlers. */
export async function shareAssetFile(
  connection: MobileConnection,
  asset: AssetSummary,
): Promise<ShareAssetResult> {
  return beginShareAsset(connection, asset)
}

function downloadBlob(
  asset: AssetSummary,
  blob: Blob,
): Promise<DownloadAssetResult> {
  const file = assetFileFromBlob(asset, blob)

  if (canShareFiles([file])) {
    return navigator
      .share({ files: [file], title: asset.originalFilename })
      .then(() => "saved" as const)
      .catch((err) => {
        if (isAbortError(err)) return "cancelled" as const
        if (isIosLikeDevice()) {
          openBlobForManualSave(blob)
          return "opened_tab" as const
        }
        throw new Error("Could not save this file. Try Share, then Save to Files.")
      })
  }

  if (isIosLikeDevice()) {
    openBlobForManualSave(blob)
    return Promise.resolve("opened_tab")
  }

  triggerAnchorDownload(blob, asset.originalFilename)
  return Promise.resolve("saved")
}

/**
 * Download / save from a tap handler. Uses a cached blob when available so iOS
 * can open the share sheet without losing the user gesture.
 */
export function beginDownloadAsset(
  connection: MobileConnection,
  asset: AssetSummary,
): Promise<DownloadAssetResult> {
  const ready = getReadyAssetBlob(connection, asset.id)
  if (ready) {
    return downloadBlob(asset, ready)
  }

  return getAssetBlob(connection, asset.id).then((blob) => downloadBlob(asset, blob))
}

/** @deprecated Use beginDownloadAsset from tap handlers. */
export async function downloadAssetFile(
  connection: MobileConnection,
  asset: AssetSummary,
): Promise<DownloadAssetResult> {
  return beginDownloadAsset(connection, asset)
}
