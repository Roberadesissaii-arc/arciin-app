"use client"

import { useEffect, useState } from "react"
import { File, Loader2 } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { getAsset, getAssets } from "@/lib/api/assets"
import { getCachedThumbnailUrl, loadThumbnail } from "@/lib/files/thumbnail-cache"
import type { AssetSummary, MediaType } from "@/lib/types/assets"

const MEDIA_TYPE_MAP: Record<string, MediaType> = {
  images: "IMAGE",
  videos: "VIDEO",
  music: "AUDIO",
  documents: "DOCUMENT",
  code: "CODE",
  python: "CODE",
  py: "CODE",
  applications: "APPLICATION",
  apps: "APPLICATION",
}

function chatListAssetFilters(
  mediaType: string,
): { mediaType?: MediaType; category?: "code" | "applications" } {
  if (mediaType === "code" || mediaType === "python" || mediaType === "py") {
    return { category: "code" }
  }
  if (mediaType === "applications" || mediaType === "apps") {
    return { category: "applications" }
  }
  const mapped = MEDIA_TYPE_MAP[mediaType]
  return mapped ? { mediaType: mapped } : {}
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AssetCard({ asset }: { asset: AssetSummary }) {
  const { connection } = useConnection()
  const wantsThumb = asset.mediaType === "IMAGE" || asset.mediaType === "VIDEO"
  const [thumbSrc, setThumbSrc] = useState<string | null>(
    wantsThumb ? getCachedThumbnailUrl(asset.id) : null,
  )
  const [thumbFailed, setThumbFailed] = useState(false)

  useEffect(() => {
    if (!connection || !wantsThumb) return
    const cached = getCachedThumbnailUrl(asset.id)
    if (cached) {
      setThumbSrc(cached)
      setThumbFailed(false)
      return
    }
    let cancelled = false
    void loadThumbnail(connection, asset.id).then((url) => {
      if (cancelled) return
      if (url) {
        setThumbSrc(url)
        setThumbFailed(false)
      } else {
        setThumbFailed(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [asset.id, connection, wantsThumb])

  const hasThumb = Boolean(thumbSrc) && !thumbFailed

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl bg-white"
      style={{ border: "1px solid #e5e5e5" }}
    >
      <div className="relative aspect-video overflow-hidden bg-[#f0f0f0]">
        {hasThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbSrc!} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#c0c0c0]">
            <File className="size-6" />
          </div>
        )}
        {asset.mediaType === "VIDEO" ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
            Video
          </span>
        ) : null}
      </div>
      <div className="px-2.5 py-2">
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-[#222222]">
          {asset.originalFilename}
        </p>
        <p className="mt-0.5 text-[10px] text-[#a0a0a0]">{fmtBytes(asset.sizeBytes)}</p>
      </div>
    </div>
  )
}

function AssetGrid({ assets, limit }: { assets: AssetSummary[]; limit: number }) {
  const shown = assets.slice(0, limit)
  const cols = shown.length === 1 ? "grid-cols-1 max-w-[220px]" : "grid-cols-2"

  return (
    <div className={`my-2 grid gap-2 ${cols}`}>
      {shown.map((asset) => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  )
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div
      className="my-2 flex items-center gap-2 rounded-xl px-4 py-3 text-[12px] text-[#717171]"
      style={{ border: "1px solid #e5e5e5", backgroundColor: "#fafafa" }}
    >
      <Loader2 className="size-3.5 animate-spin text-[#ff4f12]" />
      Loading {label}…
    </div>
  )
}

export function ChatInlineAssetBlock({
  mediaType,
  limit = 9,
}: {
  mediaType: string
  limit?: number
}) {
  const { connection } = useConnection()
  const [assets, setAssets] = useState<AssetSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filters = chatListAssetFilters(mediaType)

  useEffect(() => {
    if (!connection) return
    let cancelled = false
    setAssets(null)
    setError(null)

    void getAssets(connection, filters)
      .then((list) => {
        if (!cancelled) {
          const sorted = [...list].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
          setAssets(sorted)
        }
      })
      .catch(() => {
        if (!cancelled) setError(`Could not load ${mediaType}.`)
      })

    return () => {
      cancelled = true
    }
  }, [connection, filters.category, filters.mediaType, mediaType])

  if (!connection) return null
  if (assets === null && !error) return <LoadingBlock label={mediaType} />
  if (error) {
    return (
      <p className="my-2 text-[12px] text-[#b91c1c]">{error}</p>
    )
  }
  if (!assets?.length) {
    return (
      <p className="my-2 text-[12px] text-[#717171]">No {mediaType} found in your library.</p>
    )
  }

  return <AssetGrid assets={assets} limit={limit} />
}

export function ChatInlineAssetBlockByIds({ assetIds }: { assetIds: string[] }) {
  const { connection } = useConnection()
  const [assets, setAssets] = useState<AssetSummary[] | null>(null)

  useEffect(() => {
    if (!connection || assetIds.length === 0) return
    let cancelled = false
    setAssets(null)

    void Promise.all(
      assetIds.map((id) =>
        getAsset(connection, id).catch(() => null),
      ),
    )
      .then((picked) => {
        if (!cancelled) {
          setAssets(picked.filter((a): a is AssetSummary => a !== null))
        }
      })
      .catch(() => {
        if (!cancelled) setAssets([])
      })

    return () => {
      cancelled = true
    }
  }, [connection, assetIds])

  if (!connection || assetIds.length === 0) return null
  if (assets === null) return <LoadingBlock label="files" />
  if (!assets.length) return null

  return <AssetGrid assets={assets} limit={assetIds.length} />
}
