"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { CloudUpload } from "lucide-react"

import { AssetThumbnail } from "@/components/files/asset-thumbnail"
import { AssetSourceChip } from "@/components/files/asset-source-chip"
import { AssetTypeBadge } from "@/components/files/asset-type-badge"
import { useConnection } from "@/components/providers/connection-provider"
import { getAssets } from "@/lib/api/assets"
import { formatApiError } from "@/lib/api/errors"
import { isServerConnected, suppressFetchErrorWhenOffline } from "@/lib/connection/offline-ui"
import type { AssetSummary } from "@/lib/types/assets"
import { cn } from "@/lib/utils"

export const HOME_RECENT_UPLOADS_LIMIT = 6

function UploadTile({
  asset,
  connection,
  eager,
}: {
  asset: AssetSummary
  connection: NonNullable<ReturnType<typeof useConnection>["connection"]>
  eager?: boolean
}) {
  return (
    <Link
      href={`/files/view/${encodeURIComponent(asset.id)}`}
      title={asset.originalFilename}
      className={cn(
        "relative block aspect-square overflow-hidden rounded-xl",
        "border border-[#e5e5e5] bg-[#fafafa] active:opacity-90",
      )}
    >
      <div className="absolute inset-0">
        <AssetThumbnail
          asset={asset}
          connection={connection}
          className="size-full rounded-none border-0"
          eager={eager}
          documentThumbnailsEnabled
        />
      </div>
      <AssetSourceChip asset={asset} className="absolute left-1.5 top-1.5 z-10" />
      {asset.status !== "READY" ? (
        <span className="absolute right-1.5 top-1.5 z-10 rounded-md bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          {asset.status === "PROCESSING" ? "Processing" : asset.status}
        </span>
      ) : null}
      <AssetTypeBadge asset={asset} className="absolute bottom-1.5 right-1.5 z-10" />
    </Link>
  )
}

function UploadGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2" aria-hidden>
      {Array.from({ length: HOME_RECENT_UPLOADS_LIMIT }).map((_, i) => (
        <div
          key={i}
          className="aspect-square animate-pulse rounded-xl bg-[#ececec]"
          style={{ border: "1px solid #e5e5e5" }}
        />
      ))}
    </div>
  )
}

export function RecentUploadsGrid() {
  const { connection, ready, serverReachable } = useConnection()
  const [assets, setAssets] = useState<AssetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!connection) return
    setLoading(true)
    setError(null)
    try {
      const list = await getAssets(connection, {}, signal)
      if (!signal?.aborted) {
        setAssets(list.slice(0, HOME_RECENT_UPLOADS_LIMIT))
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(suppressFetchErrorWhenOffline(serverReachable, formatApiError(err)))
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [connection, serverReachable])

  useEffect(() => {
    if (!ready || !connection || !isServerConnected(serverReachable)) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection?.sessionToken, serverReachable, load])

  if (!connection) return null

  if (loading) {
    return <UploadGridSkeleton />
  }

  if (error) {
    return (
      <div
        className="rounded-2xl px-4 py-6 text-center text-[12px] text-[#b91c1c]"
        style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
      >
        {error}
      </div>
    )
  }

  if (!assets.length) {
    return (
      <div
        className="flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-10 text-center"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="empty-state-icon flex size-12 items-center justify-center rounded-2xl">
          <CloudUpload className="text-accent size-5" />
        </div>
        <p className="text-[13px] font-semibold text-[#222222]">No uploads yet</p>
        <p className="max-w-[16rem] text-[12px] leading-relaxed text-[#717171]">
          Drop files in Files — Arciin will sort them into the right library.
        </p>
        <Link
          href="/files"
          className="text-accent mt-1 text-[12px] font-semibold active:opacity-70"
        >
          Open Files
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {assets.map((asset, index) => (
        <UploadTile
          key={asset.id}
          asset={asset}
          connection={connection}
          eager={index < 4}
        />
      ))}
    </div>
  )
}

export function RecentUploadsSection() {
  return (
    <div>
      <RecentUploadsGrid />
    </div>
  )
}
