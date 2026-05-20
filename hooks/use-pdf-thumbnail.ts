"use client"

import { useEffect, useState } from "react"

import {
  getCachedPdfThumbnail,
  loadPdfThumbnail,
  pdfThumbnailCacheKey,
  readPdfThumbnailCache,
} from "@/lib/files/pdf-thumbnail"
import type { MobileConnection } from "@/lib/types/api"

export function usePdfThumbnail(
  connection: MobileConnection | null,
  assetId: string,
  updatedAt: string,
  enabled: boolean,
): { thumb: string | null; isGenerating: boolean } {
  const cacheKey = pdfThumbnailCacheKey(assetId, updatedAt)
  const [thumb, setThumb] = useState<string | null>(() =>
    enabled ? getCachedPdfThumbnail(assetId, updatedAt) : null,
  )
  const [cacheChecked, setCacheChecked] = useState(() =>
    Boolean(enabled && getCachedPdfThumbnail(assetId, updatedAt)),
  )
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setCacheChecked(false)
      return
    }

    const mem = getCachedPdfThumbnail(assetId, updatedAt)
    if (mem) {
      setThumb(mem)
      setCacheChecked(true)
      return
    }

    let cancelled = false
    setCacheChecked(false)
    void readPdfThumbnailCache(assetId, updatedAt).then((cached) => {
      if (cancelled) return
      if (cached) setThumb(cached)
      setCacheChecked(true)
    })

    return () => {
      cancelled = true
    }
  }, [cacheKey, enabled, assetId, updatedAt])

  useEffect(() => {
    if (!enabled || !connection || !cacheChecked || thumb) return

    let cancelled = false
    setIsGenerating(true)

    void loadPdfThumbnail(connection, assetId, updatedAt).then((dataUrl) => {
      if (!cancelled && dataUrl) setThumb(dataUrl)
      if (!cancelled) setIsGenerating(false)
    })

    return () => {
      cancelled = true
      setIsGenerating(false)
    }
  }, [cacheKey, connection, assetId, updatedAt, enabled, thumb, cacheChecked])

  const memHit = enabled ? getCachedPdfThumbnail(assetId, updatedAt) : null
  const resolved = thumb ?? memHit

  return {
    thumb: resolved,
    isGenerating: isGenerating && !resolved,
  }
}
