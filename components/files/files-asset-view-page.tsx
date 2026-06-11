"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { AssetViewer } from "@/components/files/asset-viewer"
import { useConnection } from "@/components/providers/connection-provider"
import { getAsset } from "@/lib/api/assets"
import { formatApiError } from "@/lib/api/errors"
import { listLibraries } from "@/lib/api/libraries"
import type { AssetSummary, LibrarySummary } from "@/lib/types/assets"

export function FilesAssetViewPage({ assetId }: { assetId: string }) {
  const router = useRouter()
  const { connection, ready } = useConnection()
  const [asset, setAsset] = useState<AssetSummary | null>(null)
  const [libraries, setLibraries] = useState<LibrarySummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !connection) return
    const controller = new AbortController()
    setError(null)
    void Promise.all([
      getAsset(connection, assetId, controller.signal),
      listLibraries(connection, controller.signal),
    ])
      .then(([loadedAsset, libs]) => {
        setAsset(loadedAsset)
        setLibraries(libs)
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(formatApiError(err))
      })
    return () => controller.abort()
  }, [ready, connection, assetId])

  if (!ready || !connection) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-[#a0a0a0]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <p className="text-[14px] font-semibold text-[#222222]">Could not open asset</p>
        <p className="text-[12px] text-[#717171]">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/files")}
          className="mt-2 rounded-xl bg-[#ff4f12] px-4 py-2.5 text-[13px] font-semibold text-white"
        >
          Back to Files
        </button>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-[#a0a0a0]" />
      </div>
    )
  }

  return (
    <AssetViewer
      assets={[asset]}
      initialIndex={0}
      libraries={libraries}
      connection={connection}
      browseFolderId={asset.folderId ?? null}
      onClose={() => router.push("/files")}
      onChanged={() => {
        void getAsset(connection, assetId).then(setAsset).catch(() => {})
      }}
      onDeleted={() => router.push("/files")}
    />
  )
}
