import { formatMediaDuration } from "@/lib/utils/format-duration"
import { cn } from "@/lib/utils"
import type { AssetSummary } from "@/lib/types/assets"

function isPdf(asset: Pick<AssetSummary, "mimeType" | "originalFilename">): boolean {
  return (
    asset.mimeType === "application/pdf" ||
    /\.pdf$/i.test(asset.originalFilename)
  )
}

/** Short type label shown when there's no more specific value (e.g. video duration). */
function typeLabel(asset: Pick<AssetSummary, "mediaType" | "mimeType" | "originalFilename">): string | null {
  switch (asset.mediaType) {
    case "IMAGE":
      return "IMAGE"
    case "VIDEO":
      return "VIDEO"
    case "AUDIO":
      return "MUSIC"
    case "DOCUMENT":
      return isPdf(asset) ? "PDF" : "DOC"
    case "CODE":
      return "CODE"
    default:
      return isPdf(asset) ? "PDF" : null
  }
}

/**
 * Glassy corner badge for a thumbnail: video/audio length (2:30) when known,
 * otherwise the media type (IMAGE / PDF / DOC / MUSIC / VIDEO). Matches the
 * desktop duration/type chips. Bottom-right by default.
 */
export function AssetTypeBadge({
  asset,
  className,
}: {
  asset: Pick<AssetSummary, "mediaType" | "mimeType" | "originalFilename" | "durationSeconds">
  className?: string
}) {
  const duration =
    asset.mediaType === "VIDEO" || asset.mediaType === "AUDIO"
      ? formatMediaDuration(asset.durationSeconds)
      : null
  const label = duration ?? typeLabel(asset)
  if (!label) return null

  return (
    <span
      className={cn(
        "pointer-events-none rounded-lg bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ring-1 ring-white/15 backdrop-blur-md",
        duration ? "tabular-nums" : "uppercase tracking-wide",
        className,
      )}
    >
      {label}
    </span>
  )
}
