import type { AssetSummary } from "@/lib/types/assets"

const CODE_EXTENSIONS = new Set([
  "py",
  "pyw",
  "js",
  "mjs",
  "ts",
  "tsx",
  "jsx",
  "json",
  "html",
  "css",
  "sh",
  "bash",
  "md",
  "txt",
  "yaml",
  "yml",
  "xml",
  "sql",
  "go",
  "rs",
  "java",
  "kt",
  "c",
  "cpp",
  "h",
  "cs",
  "php",
  "rb",
  "swift",
  "lua",
  "toml",
  "ini",
  "env",
  "cfg",
  "conf",
])

function extensionOf(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename
  const dot = base.lastIndexOf(".")
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ""
}

/** True when the mobile viewer can show scrollable text (source code, plain text). */
export function isTextPreviewableAsset(asset: Pick<AssetSummary, "mediaType" | "mimeType" | "originalFilename" | "sizeBytes">): boolean {
  if (asset.mediaType === "APPLICATION") return false
  if (asset.mediaType === "CODE") return true

  const ext = extensionOf(asset.originalFilename)
  if (CODE_EXTENSIONS.has(ext)) return true

  const base = asset.originalFilename.split(/[/\\]/).pop()?.toLowerCase() ?? ""
  if (base === "dockerfile" || base === "makefile" || base.startsWith(".env")) return true

  const mime = (asset.mimeType ?? "").toLowerCase()
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/javascript" ||
    mime === "application/typescript" ||
    mime === "application/xml" ||
    mime === "application/x-python-code"
  ) {
    return true
  }

  if (asset.mediaType === "DOCUMENT" && (ext === "txt" || ext === "md" || ext === "csv")) {
    return true
  }

  return false
}

export const TEXT_PREVIEW_MAX_BYTES = 512 * 1024
export const TEXT_PREVIEW_MAX_CHARS = 80_000
