import { assetFileFromBlob, canShareFiles } from "@/lib/api/asset-binary"
import {
  getAssetBlob,
  getReadyAssetBlob,
} from "@/lib/api/asset-blob-cache"
import { assetFilesViewUrl } from "@/lib/api/asset-media-urls"
import { createShareLink, shareResultUrl } from "@/lib/api/shares"
import { copyTextWithFallback } from "@/lib/utils/clipboard"
import type { MobileConnection } from "@/lib/types/api"
import type { AssetSummary } from "@/lib/types/assets"

export type ShareAssetResult =
  | "shared_file"
  | "shared_link"
  | "copied"
  | "cancelled"
  | "opened_tab"

type ShareAttemptTracker = {
  readonly pageHiddenDuringAttempt: boolean
  cleanup: () => void
}

function startShareAttemptTracker(): ShareAttemptTracker {
  let pageHiddenDuringAttempt = false
  const onVisibility = () => {
    if (document.visibilityState === "hidden") pageHiddenDuringAttempt = true
  }
  document.addEventListener("visibilitychange", onVisibility, { passive: true })
  return {
    get pageHiddenDuringAttempt() {
      return pageHiddenDuringAttempt
    },
    cleanup: () => document.removeEventListener("visibilitychange", onVisibility),
  }
}

/** iOS Safari/PWA often rejects `navigator.share` after the user successfully shared and returned. */
function isIosShareFalseFailure(err: unknown, tracker: ShareAttemptTracker): boolean {
  if (!isIosLikeDevice()) return false
  if (isAbortError(err)) return false
  return tracker.pageHiddenDuringAttempt
}

function runNativeShare(
  shareFn: () => Promise<void>,
  resultOnSuccess: ShareAssetResult,
  tracker?: ShareAttemptTracker,
): Promise<ShareAssetResult> {
  const localTracker = tracker ?? startShareAttemptTracker()
  const ownsTracker = !tracker

  return shareFn()
    .then(() => resultOnSuccess)
    .catch((err) => {
      if (isAbortError(err)) return "cancelled" as const
      if (isIosShareFalseFailure(err, localTracker)) return resultOnSuccess
      throw err
    })
    .finally(() => {
      if (ownsTracker) localTracker.cleanup()
    })
}

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
  tracker: ShareAttemptTracker,
): Promise<ShareAssetResult> {
  const file = assetFileFromBlob(asset, blob)
  if (!canShareFiles([file])) {
    return Promise.reject(new Error("File share is not supported on this device."))
  }
  return runNativeShare(
    () => navigator.share({ files: [file], title }),
    "shared_file",
    tracker,
  )
}

async function shareFileAfterFetch(
  connection: MobileConnection,
  asset: AssetSummary,
  title: string,
  viewUrl: string,
  tracker: ShareAttemptTracker,
): Promise<ShareAssetResult> {
  const ready = getReadyAssetBlob(connection, asset.id)
  const blob = ready ?? (await getAssetBlob(connection, asset.id))
  const file = assetFileFromBlob(asset, blob)

  if (canShareFiles([file])) {
    try {
      return await runNativeShare(
        () => navigator.share({ files: [file], title }),
        "shared_file",
        tracker,
      )
    } catch (err) {
      if (isAbortError(err)) return "cancelled"
      if (isIosShareFalseFailure(err, tracker)) return "shared_file"
    }
  }

  if (typeof navigator.share === "function") {
    try {
      return await runNativeShare(
        () => navigator.share({ title, text: title, url: viewUrl }),
        "shared_link",
        tracker,
      )
    } catch (err) {
      if (isAbortError(err)) return "cancelled"
      if (isIosShareFalseFailure(err, tracker)) return "shared_link"
    }
  }

  // Share sheet was shown — do not fall through to tab open + error banner.
  if (tracker.pageHiddenDuringAttempt) {
    return canShareFiles([file]) ? "shared_file" : "shared_link"
  }

  if (await copyTextWithFallback(viewUrl)) {
    return "copied"
  }
  if (isIosLikeDevice()) {
    openBlobForManualSave(blob)
    return "opened_tab" as ShareAssetResult
  }
  throw new Error("Could not share this file on this device.")
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
  const tracker = startShareAttemptTracker()

  const finish = (result: Promise<ShareAssetResult>) =>
    result.finally(() => tracker.cleanup())

  if (ready) {
    return finish(
      shareFilesFromGesture(asset, ready, title, tracker).catch((err) => {
        if (isAbortError(err)) return "cancelled" as const
        if (isIosShareFalseFailure(err, tracker)) return "shared_file" as const
        if (typeof navigator.share === "function") {
          return runNativeShare(
            () => navigator.share({ title, url: viewUrl }),
            "shared_link",
            tracker,
          ).catch((linkErr) => {
            if (isAbortError(linkErr)) return "cancelled" as const
            if (isIosShareFalseFailure(linkErr, tracker)) return "shared_link" as const
            return shareFileAfterFetch(connection, asset, title, viewUrl, tracker)
          })
        }
        return shareFileAfterFetch(connection, asset, title, viewUrl, tracker)
      }),
    )
  }

  if (typeof navigator.share === "function") {
    return finish(
      runNativeShare(() => navigator.share({ title, url: viewUrl }), "shared_link", tracker).catch(
        (err) => {
          if (isAbortError(err)) return "cancelled" as const
          if (isIosShareFalseFailure(err, tracker)) return "shared_link" as const
          return shareFileAfterFetch(connection, asset, title, viewUrl, tracker)
        },
      ),
    )
  }

  return finish(shareFileAfterFetch(connection, asset, title, viewUrl, tracker))
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

async function collectAssetFiles(
  connection: MobileConnection,
  assets: AssetSummary[],
): Promise<File[]> {
  // Fetch in parallel so the whole batch resolves fast enough to stay inside the
  // iOS user-gesture window for navigator.share. Order is preserved by Promise.all.
  return Promise.all(
    assets.map(async (asset) => {
      const ready = getReadyAssetBlob(connection, asset.id)
      const blob = ready ?? (await getAssetBlob(connection, asset.id))
      return assetFileFromBlob(asset, blob)
    }),
  )
}

/**
 * Copy a link to the clipboard; if the Clipboard API itself is unavailable
 * (e.g. an insecure/HTTP context, common on a self-hosted instance reached by
 * LAN IP before a reverse proxy/TLS is set up), fall back to a native text
 * prompt so the user can still copy it by hand instead of hitting a dead end.
 */
async function copyLinkOrPrompt(url: string): Promise<ShareAssetResult> {
  if (await copyTextWithFallback(url)) {
    return "copied"
  }
  window.prompt("Copy this link to share:", url)
  return "copied"
}

/**
 * Share multiple assets as one link.
 *
 * Packaging several real files into `navigator.share({ files })` is poorly
 * and inconsistently supported across mobile browsers/OSes — that's the
 * "could not share these files on this device" failure. Desktop already
 * solves multi-file sharing by creating a real share link instead of
 * attaching raw files; mirror that here: create the link, then share/copy
 * the URL (which OS share sheets handle near-universally).
 */
export async function beginShareAssets(
  connection: MobileConnection,
  assets: AssetSummary[],
): Promise<ShareAssetResult> {
  if (assets.length === 0) return "cancelled"
  if (assets.length === 1) return beginShareAsset(connection, assets[0]!)

  const title = `${assets.length} files`
  const tracker = startShareAttemptTracker()

  try {
    const shareResult = await createShareLink(connection, {
      resourceType: "ASSETS",
      assetIds: assets.map((asset) => asset.id),
      label: title,
    })
    const url = shareResultUrl(connection, shareResult)

    if (typeof navigator.share === "function") {
      try {
        return await runNativeShare(() => navigator.share({ title, url }), "shared_link", tracker)
      } catch (err) {
        if (isAbortError(err)) return "cancelled"
        if (isIosShareFalseFailure(err, tracker)) return "shared_link"
        if (tracker.pageHiddenDuringAttempt) return "shared_link"
      }
    }

    return await copyLinkOrPrompt(url)
  } finally {
    tracker.cleanup()
  }
}

/** Download / save one or more assets. */
export async function beginDownloadAssets(
  connection: MobileConnection,
  assets: AssetSummary[],
): Promise<DownloadAssetResult> {
  if (assets.length === 0) return "cancelled"
  if (assets.length === 1) return beginDownloadAsset(connection, assets[0]!)

  const files = await collectAssetFiles(connection, assets)

  // iOS: the share sheet offers "Save N Images" straight to Photos.
  if (canShareFiles(files) && typeof navigator.share === "function") {
    try {
      await navigator.share({ files, title: `${assets.length} files` })
      return "saved"
    } catch (err) {
      if (isAbortError(err)) return "cancelled"
    }
  }

  if (isIosLikeDevice()) {
    if (files[0]) openBlobForManualSave(files[0])
    return "opened_tab"
  }

  files.forEach((file, index) => {
    triggerAnchorDownload(file, assets[index]!.originalFilename)
  })
  return "saved"
}
