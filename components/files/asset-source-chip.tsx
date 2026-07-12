import { detectAssetSource } from "@/lib/utils/asset-source"
import { cn } from "@/lib/utils"
import type { AssetSummary } from "@/lib/types/assets"

/**
 * Source badge for asset thumbnails — the source NAME (Instagram, Facebook, …)
 * for link imports, or Computer/Phone for manual uploads. Text label, brand
 * color, matching the desktop asset-card badge. Returns null when nothing to show.
 */
export function AssetSourceChip({
  asset,
  className,
}: {
  asset: Pick<AssetSummary, "importSourceUrl" | "uploadClient">
  className?: string
}) {
  const source = detectAssetSource(asset.importSourceUrl)

  let label: string | null = null
  let color = "#52525b"

  if (source) {
    label = source.label
    color = source.color
  } else if (asset.uploadClient === "mobile") {
    label = "Phone"
  } else if (asset.uploadClient === "web") {
    label = "Computer"
  }

  if (!label) return null

  return (
    <span
      className={cn(
        "inline-flex max-w-[calc(100%-0.75rem)] items-center truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm ring-1 ring-black/10",
        className,
      )}
      style={{ backgroundColor: color }}
      title={label}
    >
      {label}
    </span>
  )
}
