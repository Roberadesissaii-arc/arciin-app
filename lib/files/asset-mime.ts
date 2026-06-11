const mimeByExt: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  opus: "audio/opus",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  txt: "text/plain",
  json: "application/json",
  zip: "application/zip",
}

function fileExtension(filename: string): string {
  const lower = filename.toLowerCase()
  const i = lower.lastIndexOf(".")
  return i >= 0 ? lower.slice(i + 1) : ""
}

/** Pick a MIME type iOS Web Share accepts for the file extension. */
export function resolveAssetMimeType(
  mimeType: string | null | undefined,
  originalFilename: string,
  blobType?: string | null,
): string {
  const stored = (mimeType ?? "").trim()
  if (stored && stored !== "application/octet-stream") return stored

  const fromBlob = (blobType ?? "").trim()
  if (fromBlob && fromBlob !== "application/octet-stream") return fromBlob

  const ext = fileExtension(originalFilename)
  return mimeByExt[ext] ?? (stored || "application/octet-stream")
}
