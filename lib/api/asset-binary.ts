import {
  assetDownloadFetchUrl,
  assetDownloadRequestInit,
} from "@/lib/api/asset-media-urls"
import { resolveAssetMimeType } from "@/lib/files/asset-mime"
import type { MobileConnection } from "@/lib/types/api"
import type { AssetSummary } from "@/lib/types/assets"

export function assetFileFromBlob(
  asset: Pick<AssetSummary, "originalFilename" | "mimeType">,
  blob: Blob,
): File {
  const mime = resolveAssetMimeType(asset.mimeType, asset.originalFilename, blob.type)
  return new File([blob], asset.originalFilename, { type: mime })
}

export function canShareFiles(files: File[]): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.canShare?.({ files }))
}

/** Authenticated binary fetch (works through the same-origin API proxy). */
export async function fetchAssetBlob(
  connection: MobileConnection,
  assetId: string,
  inline = false,
): Promise<Blob> {
  const res = await fetch(
    assetDownloadFetchUrl(connection, assetId, inline),
    assetDownloadRequestInit(connection),
  )
  if (!res.ok) throw new Error("Download failed")

  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) throw new Error("Download failed")

  const blob = await res.blob()
  if (blob.size === 0) throw new Error("Download failed")
  return blob
}
