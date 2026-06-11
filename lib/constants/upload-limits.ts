/** Default max upload size: 20 GiB (20 × 1024 MB). */
export const DEFAULT_MAX_UPLOAD_SIZE_MB = 20 * 1024

export const DEFAULT_UPLOAD_RATE_LIMIT_PER_MINUTE = 500

export function uploadMbToGbLabel(mb: number): string {
  const gb = mb / 1024
  return Number.isInteger(gb) ? String(gb) : gb.toFixed(1).replace(/\.0$/, "")
}

export function uploadGbInputToMb(gb: string): number | null {
  const value = Number.parseFloat(gb.replace(/,/g, "").trim())
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 1024)
}
