"use client"

import { useEffect, useState } from "react"

import {
  getCachedPdfThumbnail,
  loadPdfThumbnail,
  pdfThumbnailCacheKey,
} from "@/lib/files/pdf-thumbnail"
import type { MobileConnection } from "@/lib/types/api"

export function usePdfThumbnail(
  connection: MobileConnection | null,
  assetId: string,
  updatedAt: string,
  enabled: boolean,
): string | null {
  const cacheKey = pdfThumbnailCacheKey(assetId, updatedAt)
  const memHit = enabled ? getCachedPdfThumbnail(assetId, updatedAt) : null
  const [thumb, setThumb] = useState<string | null>(memHit)

  useEffect(() => {
    if (!enabled || !connection) return
    if (getCachedPdfThumbnail(assetId, updatedAt)) return

    let cancelled = false

    void loadPdfThumbnail(connection, assetId, updatedAt).then((dataUrl) => {
      if (!cancelled && dataUrl) setThumb(dataUrl)
    })

    return () => {
      cancelled = true
    }
  }, [cacheKey, connection, assetId, updatedAt, enabled])

  return thumb ?? memHit
}
