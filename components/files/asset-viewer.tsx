"use client"

import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  ArrowRightLeft,
  Download,
  Loader2,
  Trash2,
  X,
} from "lucide-react"

import {
  assetDownloadUrl,
  deleteAsset,
  downloadAssetFile,
  moveAsset,
} from "@/lib/api/assets"
import { formatApiError } from "@/lib/api/errors"
import { loadThumbnail } from "@/lib/files/thumbnail-cache"
import type { MobileConnection } from "@/lib/types/api"
import type { AssetSummary, LibrarySummary } from "@/lib/types/assets"
import { formatBytes } from "@/lib/utils/format-bytes"

type AssetViewerProps = {
  asset: AssetSummary
  libraries: LibrarySummary[]
  connection: MobileConnection
  onClose: () => void
  onChanged: () => void
  onDeleted: (assetId: string) => void
}

function lockPageScroll() {
  const html = document.documentElement
  const body = document.body
  const prevHtml = html.style.overflow
  const prevBody = body.style.overflow
  const prevPos = body.style.position
  html.style.overflow = "hidden"
  body.style.overflow = "hidden"
  body.style.position = "fixed"
  body.style.inset = "0"
  body.style.width = "100%"

  const blockTouch = (e: TouchEvent) => {
    e.preventDefault()
  }
  document.addEventListener("touchmove", blockTouch, { passive: false })

  return () => {
    html.style.overflow = prevHtml
    body.style.overflow = prevBody
    body.style.position = prevPos
    body.style.inset = ""
    body.style.width = ""
    document.removeEventListener("touchmove", blockTouch)
  }
}

export function AssetViewer({
  asset,
  libraries,
  connection,
  onClose,
  onChanged,
  onDeleted,
}: AssetViewerProps) {
  const [mounted, setMounted] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [busy, setBusy] = useState<"download" | "delete" | "move" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const isPdf = asset.mimeType === "application/pdf"
  const [previewLoading, setPreviewLoading] = useState(
    asset.mediaType === "IMAGE" || asset.mediaType === "VIDEO" || isPdf,
  )

  const title = asset.title?.trim() || asset.originalFilename
  const otherLibraries = libraries.filter((l) => l.id !== asset.libraryId)
  const currentLibrary = libraries.find((l) => l.id === asset.libraryId)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    return lockPageScroll()
  }, [mounted])

  useEffect(() => {
    if (asset.mediaType !== "IMAGE" && asset.mediaType !== "VIDEO") {
      void loadThumbnail(connection, asset.id).then((url) => {
        if (url) setPreviewSrc(url)
        setPreviewLoading(false)
      })
      return
    }

    let cancelled = false
    let objectUrl: string | null = null
    setPreviewLoading(true)
    setPreviewSrc(null)

    const url = assetDownloadUrl(connection, asset.id, true)
    void fetch(url, {
      headers: { Authorization: `Bearer ${connection.sessionToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("preview")
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) {
          void loadThumbnail(connection, asset.id).then((thumb) => {
            if (!cancelled && thumb) setPreviewSrc(thumb)
          })
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [asset.id, asset.mediaType, connection])

  const handleDownload = useCallback(async () => {
    setBusy("download")
    setError(null)
    try {
      await downloadAssetFile(connection, asset)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(null)
    }
  }, [asset, connection])

  const handleDelete = useCallback(async () => {
    const ok = window.confirm(`Delete “${title}”? This cannot be undone.`)
    if (!ok) return
    setBusy("delete")
    setError(null)
    try {
      await deleteAsset(connection, asset.id)
      onDeleted(asset.id)
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(null)
    }
  }, [asset.id, connection, onClose, onDeleted, title])

  const handleMove = useCallback(
    async (libraryId: string) => {
      setBusy("move")
      setError(null)
      try {
        await moveAsset(connection, asset.id, { libraryId, folderId: null })
        setMoveOpen(false)
        onChanged()
        onClose()
      } catch (err) {
        setError(formatApiError(err))
      } finally {
        setBusy(null)
      }
    },
    [asset.id, connection, onChanged, onClose],
  )

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex h-[100dvh] max-h-[100dvh] flex-col bg-[#09090b]"
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
    >
      <div
        className="flex shrink-0 items-center justify-between gap-3 border-b border-[#27272a] px-4 py-2.5"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-full bg-[#27272a] text-white active:bg-[#3f3f46]"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[13px] font-semibold text-white">{title}</p>
          <p className="text-[10px] text-[#a1a1aa]">
            {currentLibrary?.name ?? "Library"} · {formatBytes(asset.sizeBytes)}
          </p>
        </div>
        <div className="size-9 shrink-0" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#09090b]">
        <div className="absolute inset-0 flex items-center justify-center p-2">
          {previewLoading ? (
            <Loader2 className="size-8 animate-spin text-[#71717a]" />
          ) : asset.mediaType === "VIDEO" && previewSrc ? (
            <video
              src={previewSrc}
              controls
              playsInline
              className="max-h-full max-w-full object-contain"
            />
          ) : previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={title}
              className="h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <p className="text-[13px] text-[#71717a]">Preview unavailable</p>
          )}
        </div>
      </div>

      {error ? (
        <p className="shrink-0 px-4 pb-1 text-center text-[11px] text-red-400">{error}</p>
      ) : null}

      {moveOpen ? (
        <div
          className="shrink-0 border-t border-[#27272a] bg-[#18181b] px-4 py-3"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
            Move to library
          </p>
          <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto">
            {otherLibraries.length === 0 ? (
              <p className="text-[12px] text-[#71717a]">No other libraries.</p>
            ) : (
              otherLibraries.map((lib) => (
                <button
                  key={lib.id}
                  type="button"
                  disabled={busy === "move"}
                  onClick={() => void handleMove(lib.id)}
                  className="flex items-center justify-between rounded-lg bg-[#27272a] px-3 py-2.5 text-left text-[13px] font-medium text-white active:bg-[#3f3f46] disabled:opacity-50"
                >
                  {lib.name}
                  <span className="text-[10px] text-[#a1a1aa]">{lib.assetCount}</span>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => setMoveOpen(false)}
            className="mt-2 w-full rounded-lg bg-[#27272a] py-2 text-[12px] font-medium text-[#d4d4d8] active:bg-[#3f3f46]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div
          className="grid shrink-0 grid-cols-3 gap-2 border-t border-[#27272a] bg-[#18181b] px-4 py-2.5"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => setMoveOpen(true)}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#27272a] text-[12px] font-semibold text-white active:bg-[#3f3f46] disabled:opacity-50"
          >
            {busy === "move" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="size-4" />
            )}
            Move
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleDownload()}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#27272a] text-[12px] font-semibold text-white active:bg-[#3f3f46] disabled:opacity-50"
          >
            {busy === "download" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Download
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleDelete()}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#dc2626] text-[12px] font-semibold text-white active:bg-[#b91c1c] disabled:opacity-50"
          >
            {busy === "delete" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
