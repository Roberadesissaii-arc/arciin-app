"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ChevronDown, File, Loader2, Play } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { getAsset, getAssets } from "@/lib/api/assets"
import { getCachedPdfThumbnail, isPdfAsset, loadPdfThumbnail } from "@/lib/files/pdf-thumbnail"
import { getCachedThumbnailUrl, loadThumbnail } from "@/lib/files/thumbnail-cache"
import type { AssetSummary, MediaType } from "@/lib/types/assets"

const MEDIA_TYPE_MAP: Record<string, MediaType> = {
  image: "IMAGE",
  images: "IMAGE",
  video: "VIDEO",
  videos: "VIDEO",
  music: "AUDIO",
  audio: "AUDIO",
  document: "DOCUMENT",
  documents: "DOCUMENT",
  pdf: "DOCUMENT",
  pdfs: "DOCUMENT",
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
  const isPdf = isPdfAsset(asset)
  const wantsMediaThumb = asset.mediaType === "IMAGE" || asset.mediaType === "VIDEO"
  const wantsPdfThumb = asset.mediaType === "DOCUMENT" && isPdf
  const [thumbSrc, setThumbSrc] = useState<string | null>(() => {
    if (wantsMediaThumb) return getCachedThumbnailUrl(asset.id)
    if (wantsPdfThumb) return getCachedPdfThumbnail(asset.id, asset.updatedAt)
    return null
  })
  const [thumbFailed, setThumbFailed] = useState(false)

  useEffect(() => {
    if (!connection) return

    if (wantsMediaThumb) {
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
    }

    if (wantsPdfThumb) {
      const cached = getCachedPdfThumbnail(asset.id, asset.updatedAt)
      if (cached) {
        setThumbSrc(cached)
        setThumbFailed(false)
        return
      }
      let cancelled = false
      void loadPdfThumbnail(connection, asset.id, asset.updatedAt).then((url) => {
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
    }

    if (asset.mediaType === "DOCUMENT") {
      const cached = getCachedThumbnailUrl(asset.id)
      if (cached) {
        setThumbSrc(cached)
        return
      }
      let cancelled = false
      void loadThumbnail(connection, asset.id).then((url) => {
        if (!cancelled && url) setThumbSrc(url)
      })
      return () => {
        cancelled = true
      }
    }
  }, [asset.id, asset.mediaType, asset.updatedAt, connection, wantsMediaThumb, wantsPdfThumb])

  const hasThumb = Boolean(thumbSrc) && !thumbFailed
  const isVideo = asset.mediaType === "VIDEO"

  return (
    <Link
      href={`/files/view/${encodeURIComponent(asset.id)}`}
      className="flex flex-col overflow-hidden rounded-xl bg-white active:opacity-90"
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
        {isVideo ? (
          <>
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
              Video
            </span>
            <span className="absolute inset-0 flex items-center justify-center bg-black/15">
              <span className="flex size-10 items-center justify-center rounded-full bg-black/55 text-white">
                <Play className="size-4 fill-white" />
              </span>
            </span>
          </>
        ) : null}
        {isPdf ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
            PDF
          </span>
        ) : null}
      </div>
      <div className="px-2.5 py-2">
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-[#222222]">
          {asset.originalFilename}
        </p>
        <p className="mt-0.5 text-[10px] text-[#a0a0a0]">{fmtBytes(asset.sizeBytes)}</p>
      </div>
    </Link>
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

const CHAT_FILENAME_LIST_PREVIEW = 10

export function ChatInlineAssetFilenameList({ mediaType }: { mediaType: string }) {
  const { connection } = useConnection()
  const [expanded, setExpanded] = useState(false)
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
  if (assets === null && !error) return <LoadingBlock label={`${mediaType} list`} />
  if (error) {
    return <p className="my-2 text-[12px] text-[#b91c1c]">{error}</p>
  }
  if (!assets?.length) {
    return (
      <p className="my-2 text-[12px] text-[#717171]">No {mediaType} found in your library.</p>
    )
  }

  if (mediaType === "documents") {
    const shown = expanded ? assets : assets.slice(0, CHAT_FILENAME_LIST_PREVIEW)
    const remainder = expanded ? 0 : Math.max(0, assets.length - CHAT_FILENAME_LIST_PREVIEW)
    return (
      <div className="my-2">
        <AssetGrid assets={shown} limit={shown.length} />
        {remainder > 0 || expanded ? (
          <button
            type="button"
            className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium text-[#717171] transition-colors hover:bg-[#f0f0f0] hover:text-[#222222]"
            style={{ border: "1px solid #e5e5e5" }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              "Show fewer"
            ) : (
              <>
                Show {remainder} more ({assets.length.toLocaleString()} total)
                <ChevronDown className="size-3.5" />
              </>
            )}
          </button>
        ) : null}
      </div>
    )
  }

  const shown = expanded ? assets : assets.slice(0, CHAT_FILENAME_LIST_PREVIEW)
  const remainder = expanded ? 0 : Math.max(0, assets.length - CHAT_FILENAME_LIST_PREVIEW)

  return (
    <div
      className="my-2 rounded-xl px-4 py-3"
      style={{ border: "1px solid #e5e5e5", backgroundColor: "#fafafa" }}
    >
      <ul className="list-none space-y-1">
        {shown.map((asset) => (
          <li
            key={asset.id}
            className="flex items-baseline gap-2 text-[13px] leading-snug text-[#222222]"
          >
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#c0c0c0]" />
            <span className="min-w-0 flex-1 break-words">{asset.originalFilename}</span>
            <span className="shrink-0 font-mono text-[10px] text-[#a0a0a0]">
              {fmtBytes(asset.sizeBytes)}
            </span>
          </li>
        ))}
      </ul>
      {remainder > 0 || expanded ? (
        <button
          type="button"
          className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium text-[#717171] transition-colors hover:bg-[#f0f0f0] hover:text-[#222222]"
          style={{ border: "1px solid #e5e5e5" }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            "Show fewer"
          ) : (
            <>
              Show {remainder} more ({assets.length.toLocaleString()} total)
              <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      ) : null}
    </div>
  )
}
