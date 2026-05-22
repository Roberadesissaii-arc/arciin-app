import type { MediaType } from "@/lib/types/assets"

/** Client-side routing hint — server re-analyzes the file on upload. */
export function classifyFile(file: File): MediaType {
  const mime = file.type?.toLowerCase() ?? ""
  const name = file.name.toLowerCase()

  if (mime.startsWith("video/")) return "VIDEO"
  if (mime.startsWith("image/")) return "IMAGE"
  if (mime.startsWith("audio/")) return "AUDIO"

  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : ""

  if (["heic", "heif", "jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"].includes(ext)) {
    return "IMAGE"
  }
  if (["mov", "mp4", "m4v", "webm", "mkv", "avi"].includes(ext)) return "VIDEO"
  if (["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "wma"].includes(ext)) {
    return "AUDIO"
  }

  if (["pdf", "doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
    return "DOCUMENT"
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "ARCHIVE"

  if (
    mime.startsWith("application/pdf") ||
    mime.includes("document") ||
    mime.includes("msword") ||
    mime.includes("spreadsheet")
  ) {
    return "DOCUMENT"
  }

  return "OTHER"
}

export function filterIdForMediaType(mediaType: string): "videos" | "images" | "music" | "documents" | "inbox" | "all" {
  switch (mediaType) {
    case "VIDEO":
      return "videos"
    case "IMAGE":
      return "images"
    case "AUDIO":
      return "music"
    case "DOCUMENT":
      return "documents"
    default:
      return "inbox"
  }
}

export function librarySlugForFilter(
  filter: "videos" | "images" | "music" | "documents" | "inbox",
): string {
  const map = {
    videos: "videos",
    images: "images",
    music: "music",
    documents: "documents",
    inbox: "inbox",
  } as const
  return map[filter]
}
