"use client"

import { useEffect, useState } from "react"
import { Clapperboard, FileText, Files, Image as ImageIcon, Loader2, Music4 } from "lucide-react"

import { usePdfThumbnail } from "@/hooks/use-pdf-thumbnail"
import { getCachedThumbnailUrl, loadThumbnail } from "@/lib/files/thumbnail-cache"
import { isPdfAsset } from "@/lib/files/pdf-thumbnail"
import type { MobileConnection } from "@/lib/types/api"
import type { AssetSummary } from "@/lib/types/assets"

type ThumbnailProps = {
  asset: AssetSummary
  connection: MobileConnection
  className?: string
  eager?: boolean
}

function FallbackIcon({
  mediaType,
  loading = false,
}: {
  mediaType: string
  loading?: boolean
}) {
  const className = `size-7 text-[#c0c0c0]${loading ? " arciin-doc-icon-pulse" : ""}`
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

function ThumbnailCornerBadge({ label }: { label: string }) {
  return (
    <span className="absolute bottom-1 right-1 rounded-md bg-black/35 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/90">
      {label}
    </span>
  )
}

function cornerBadgeLabel(asset: AssetSummary, thumbLoading: boolean, readyExt: string) {
  if (asset.status !== "READY") {
    return asset.status === "PROCESSING" ? "Processing" : asset.status
  }
  if (thumbLoading) return "Processing"
  return readyExt
}

function PdfAssetThumbnail({ asset, connection, className = "", eager = false }: ThumbnailProps) {
  const [inView, setInView] = useState(Boolean(eager))
  const visible = eager || inView
  const thumb = usePdfThumbnail(connection, asset.id, asset.updatedAt, visible)

  useEffect(() => {
    if (eager) return
    const el = document.getElementById(`thumb-${asset.id}`)
    if (!el || !("IntersectionObserver" in window)) {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: "120px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [asset.id, eager])

  const ext = (asset.originalFilename.split(".").pop() ?? "pdf").toUpperCase()
  const thumbLoading = visible && !thumb
  const badge = cornerBadgeLabel(asset, thumbLoading, ext)

  return (
    <div
      id={`thumb-${asset.id}`}
      className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#f0f0f0] ${className}`}
      style={{ border: "1px solid #e8e8e8" }}
    >
      {thumb ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" className="size-full object-cover" />
          <ThumbnailCornerBadge label={badge} />
        </>
      ) : (
        <>
          <FallbackIcon mediaType={asset.mediaType} loading={thumbLoading} />
          <ThumbnailCornerBadge label={badge} />
        </>
      )}
    </div>
  )
}

function ServerAssetThumbnail({ asset, connection, className = "", eager = false }: ThumbnailProps) {
  const wantsThumb = asset.mediaType === "IMAGE" || asset.mediaType === "VIDEO"
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
    </div>
  )
}

export function AssetThumbnail({
  asset,
  connection,
  className = "",
  eager = false,
  documentThumbnailsEnabled = false,
}: ThumbnailProps & {
  /** When true, fetch even if not in viewport (viewer). */
  documentThumbnailsEnabled?: boolean
}) {
  if (documentThumbnailsEnabled && isPdfAsset(asset)) {
    return (
      <PdfAssetThumbnail
        asset={asset}
        connection={connection}
        className={className}
        eager={eager}
      />
    )
  }

  return (
    <ServerAssetThumbnail
      asset={asset}
      connection={connection}
      className={className}
      eager={eager}
    />
  )
}
