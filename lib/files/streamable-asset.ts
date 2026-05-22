import type { AssetSummary } from "@/lib/types/assets"

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "flac",
  "aac",
  "m4a",
  "ogg",
  "opus",
  "wma",
  "webm",
  "caf",
  "aiff",
  "aif",
])

const VIDEO_EXTENSIONS = new Set([
  "mov",
  "mp4",
  "m4v",
  "webm",
  "mkv",
  "avi",
])

function fileExtension(filename: string): string {
  const lower = filename.toLowerCase()
  const i = lower.lastIndexOf(".")
  return i >= 0 ? lower.slice(i + 1) : ""
}

export function isAudioAsset(
  asset: Pick<AssetSummary, "mediaType" | "mimeType" | "originalFilename">,
): boolean {
  if (asset.mediaType === "AUDIO") return true
  const mime = asset.mimeType?.toLowerCase() ?? ""
  if (mime.startsWith("audio/")) return true
  return AUDIO_EXTENSIONS.has(fileExtension(asset.originalFilename))
}

export function isVideoAsset(
  asset: Pick<AssetSummary, "mediaType" | "mimeType" | "originalFilename">,
): boolean {
  if (asset.mediaType === "VIDEO") return true
  const mime = asset.mimeType?.toLowerCase() ?? ""
  if (mime.startsWith("video/")) return true
  return VIDEO_EXTENSIONS.has(fileExtension(asset.originalFilename))
}

export function isInlineStreamableAsset(asset: AssetSummary): boolean {
  return isAudioAsset(asset) || isVideoAsset(asset)
}

/** Fetch full file into memory only for typical music/video sizes. */
export const INLINE_STREAM_MAX_BYTES = 80 * 1024 * 1024
