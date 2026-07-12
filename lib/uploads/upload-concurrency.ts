/** Lower concurrency on large mobile batches — keeps memory and CPU stable on iOS. */
export function uploadConcurrencyForBatch(fileCount: number): number {
  if (fileCount > 120) return 1
  if (fileCount > 50) return 2
  if (fileCount > 20) return 2
  return 3
}

/** Skip client duplicate scans above this count (server still accepts uploads). */
export const MOBILE_UPLOAD_DUPLICATE_SKIP_THRESHOLD = 12
