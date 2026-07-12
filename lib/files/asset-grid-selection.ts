export const ASSET_LONG_PRESS_MS = 480
export const ASSET_TAP_MAX_MS = 320
export const ASSET_MOVE_THRESHOLD_PX = 10

export function assetIdFromPoint(x: number, y: number): string | null {
  if (typeof document === "undefined") return null
  const el = document.elementFromPoint(x, y)?.closest("[data-asset-id]")
  return el?.getAttribute("data-asset-id") ?? null
}

export function assetIndexFromId<T extends { id: string }>(items: T[], id: string): number {
  return items.findIndex((item) => item.id === id)
}

export function assetRangeSelection<T extends { id: string }>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): Set<string> {
  const lo = Math.min(fromIndex, toIndex)
  const hi = Math.max(fromIndex, toIndex)
  const selected = new Set<string>()
  for (let index = lo; index <= hi; index += 1) {
    const item = items[index]
    if (item) selected.add(item.id)
  }
  return selected
}

export function toggleAssetSelection(selected: Set<string>, assetId: string): Set<string> {
  const next = new Set(selected)
  if (next.has(assetId)) next.delete(assetId)
  else next.add(assetId)
  return next
}
