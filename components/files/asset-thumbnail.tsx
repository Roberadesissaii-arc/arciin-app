"use client"

import { useEffect, useState } from "react"
import { Clapperboard, FileText, Files, Image as ImageIcon, Loader2, Music4 } from "lucide-react"

import { getCachedThumbnailUrl, loadThumbnail } from "@/lib/files/thumbnail-cache"
import type { MobileConnection } from "@/lib/types/api"
import type { AssetSummary } from "@/lib/types/assets"

function FallbackIcon({ mediaType }: { mediaType: string }) {
  const className = "size-7 text-[#c0c0c0]"
  switch (mediaType) {
    case "VIDEO":
      return <Clapperboard className={className} />
    case "IMAGE":
      return <ImageIcon className={className} />
    case "AUDIO":
      return <Music4 className={className} />
    case "DOCUMENT":
      return <FileText className={className} />
    default:
      return <Files className={className} />
  }
}

function assetWantsThumbnail(
  asset: AssetSummary,
  documentThumbnailsEnabled: boolean,
): boolean {
  if (asset.mediaType === "IMAGE" || asset.mediaType === "VIDEO") return true
  if (!documentThumbnailsEnabled) return false
  const mime = (asset.mimeType ?? "").toLowerCase()
  if (mime === "application/pdf") return true
  const name = (asset.originalFilename ?? "").toLowerCase()
  return name.endsWith(".pdf")
}

export function AssetThumbnail({
  asset,
  connection,
  className = "",
  eager = false,
  documentThumbnailsEnabled = false,
}: {
  asset: AssetSummary
  connection: MobileConnection
  className?: string
  /** When true, fetch even if not in viewport (viewer). */
  eager?: boolean
  documentThumbnailsEnabled?: boolean
}) {
  const wantsThumb = assetWantsThumbnail(asset, documentThumbnailsEnabled)
  const cached = wantsThumb ? getCachedThumbnailUrl(asset.id) : null

  const [src, setSrc] = useState<string | null>(cached)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(wantsThumb && !cached && !failed)

  useEffect(() => {
    if (!wantsThumb) {
      setLoading(false)
      return
    }

    const hit = getCachedThumbnailUrl(asset.id)
    if (hit) {
      setSrc(hit)
      setLoading(false)
      setFailed(false)
      return
    }

    if (!eager) {
      const el = document.getElementById(`thumb-${asset.id}`)
      if (el && "IntersectionObserver" in window) {
        let cancelled = false
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              observer.disconnect()
              if (!cancelled) void fetchThumb()
            }
          },
          { rootMargin: "120px" },
        )
        observer.observe(el)
        return () => {
          cancelled = true
          observer.disconnect()
        }
      }
    }

    void fetchThumb()

    async function fetchThumb() {
      setLoading(true)
      setFailed(false)
      const url = await loadThumbnail(connection, asset.id)
      if (url) {
        setSrc(url)
        setLoading(false)
      } else {
        setFailed(true)
        setLoading(false)
      }
    }
  }, [asset.id, connection, eager, wantsThumb])

  return (
    <div
      id={`thumb-${asset.id}`}
      className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#f0f0f0] ${className}`}
      style={{ border: "1px solid #e8e8e8" }}
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-[#c0c0c0]" />
      ) : src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <FallbackIcon mediaType={asset.mediaType} />
      )}
      {asset.status !== "READY" ? (
        <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
          {asset.status === "PROCESSING" ? "Processing" : asset.status}
        </span>
      ) : null}
    </div>
  )
}
