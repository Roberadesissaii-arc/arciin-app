"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ArrowRightLeft,
  Download,
  Loader2,
  Trash2,
  X,
} from "lucide-react"

import { DeleteAssetDialog } from "@/components/files/delete-asset-dialog"
import { MobileMoveFolderSheet } from "@/components/files/mobile-move-folder-sheet"
import {
  assetDownloadUrl,
  assetStreamUrl,
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
  assets: AssetSummary[]
  initialIndex: number
  libraries: LibrarySummary[]
  connection: MobileConnection
  browseFolderId?: string | null
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
    const target = e.target
    if (target instanceof Element && target.closest("[data-scroll-lock-allow]")) return
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
  assets,
  initialIndex,
  libraries,
  connection,
  browseFolderId,
  onClose,
  onChanged,
  onDeleted,
}: AssetViewerProps) {
  const [mounted, setMounted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState<"download" | "delete" | "move" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const asset = assets[currentIndex] ?? assets[0]!
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < assets.length - 1

  const isPdf = asset.mimeType === "application/pdf"
  const streamsInline = asset.mediaType === "VIDEO" || asset.mediaType === "AUDIO"
  const loadsMediaBlob = asset.mediaType === "IMAGE" || isPdf
  const [previewLoading, setPreviewLoading] = useState(loadsMediaBlob)

  const title = asset.title?.trim() || asset.originalFilename
  const currentLibrary = libraries.find((l) => l.id === asset.libraryId)

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= assets.length) return
    setCurrentIndex(index)
    setError(null)
    setMoveOpen(false)
    setDeleteOpen(false)
    setBusy(null)
  }, [assets.length])

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (!mounted) return; return lockPageScroll() }, [mounted])

  // reset preview when asset changes
  useEffect(() => {
    setPreviewSrc(null)
    setPreviewLoading(loadsMediaBlob)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id])

  useEffect(() => {
    if (streamsInline) {
      setPreviewSrc(assetStreamUrl(connection, asset.id))
      setPreviewLoading(false)
      return
    }

    if (!loadsMediaBlob) {
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
      credentials: "include",
    })
      .then((res) => { if (!res.ok) throw new Error("preview"); return res.blob() })
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
      .finally(() => { if (!cancelled) setPreviewLoading(false) })

    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [asset.id, loadsMediaBlob, streamsInline, connection])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
    touchStartY.current = e.touches[0]?.clientY ?? null
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    const dy = (e.changedTouches[0]?.clientY ?? 0) - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dy) > Math.abs(dx) * 0.8) return
    if (dx < -50 && hasNext) goTo(currentIndex + 1)
    else if (dx > 50 && hasPrev) goTo(currentIndex - 1)
  }, [currentIndex, hasPrev, hasNext, goTo])

  const handleDownload = useCallback(async () => {
    setBusy("download")
    setError(null)
    try { await downloadAssetFile(connection, asset) }
    catch (err) { setError(formatApiError(err)) }
    finally { setBusy(null) }
  }, [asset, connection])

  const handleDeleteConfirm = useCallback(async () => {
    setBusy("delete")
    setError(null)
    try {
      await deleteAsset(connection, asset.id)
      setDeleteOpen(false)
      onDeleted(asset.id)
      if (assets.length <= 1) {
        onClose()
      } else {
        goTo(currentIndex > 0 ? currentIndex - 1 : 0)
      }
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(null)
    }
  }, [asset.id, assets.length, connection, currentIndex, goTo, onClose, onDeleted])

  const handleMove = useCallback(async (folderId: string | null) => {
    setBusy("move")
    setError(null)
    try {
      await moveAsset(connection, asset.id, { libraryId: asset.libraryId, folderId })
      setMoveOpen(false)
      onChanged()
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(null)
    }
  }, [asset.id, asset.libraryId, connection, onChanged, onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex h-[100dvh] max-h-[100dvh] flex-col bg-[#09090b]"
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
    >
      {/* header */}
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
            {assets.length > 1 ? ` · ${currentIndex + 1} / ${assets.length}` : ""}
          </p>
        </div>
        <div className="size-9 shrink-0" />
      </div>

      {/* preview area — swipeable */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden bg-[#09090b]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 flex items-center justify-center p-2">
          {previewLoading ? (
            <Loader2 className="size-8 animate-spin text-[#71717a]" />
          ) : asset.mediaType === "VIDEO" && previewSrc ? (
            <video src={previewSrc} controls playsInline className="max-h-full max-w-full object-contain" />
          ) : asset.mediaType === "AUDIO" && previewSrc ? (
            <audio src={previewSrc} controls playsInline preload="metadata" className="w-full max-w-md" />
          ) : previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt={title} className="h-full w-full object-contain" draggable={false} />
          ) : (
            <p className="text-[13px] text-[#71717a]">Preview unavailable</p>
          )}
        </div>

        {/* dot indicators */}
        {assets.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {assets.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to file ${i + 1}`}
                style={{
                  width: i === currentIndex ? 18 : 6,
                  height: 6,
                  borderRadius: 99,
                  transition: "width 0.2s, background-color 0.2s",
                  backgroundColor: i === currentIndex ? "#ff4f12" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        )}

        {/* invisible edge tap zones */}
        {hasPrev && (
          <button type="button" onClick={() => goTo(currentIndex - 1)}
            className="absolute left-0 top-0 h-full w-16 opacity-0" aria-label="Previous file" />
        )}
        {hasNext && (
          <button type="button" onClick={() => goTo(currentIndex + 1)}
            className="absolute right-0 top-0 h-full w-16 opacity-0" aria-label="Next file" />
        )}
      </div>

      {error ? (
        <p className="shrink-0 px-4 pb-1 text-center text-[11px] text-red-400">{error}</p>
      ) : null}

      {currentLibrary ? (
        <MobileMoveFolderSheet
          open={moveOpen}
          libraryId={asset.libraryId}
          libraryName={currentLibrary.name}
          currentFolderId={browseFolderId ?? null}
          assetFolderId={asset.folderId}
          busy={busy === "move"}
          onClose={() => setMoveOpen(false)}
          onSelect={(folderId) => void handleMove(folderId)}
        />
      ) : null}

      {/* action bar */}
      <div
        className="grid shrink-0 grid-cols-3 gap-2 border-t border-[#27272a] bg-[#18181b] px-4 py-2.5"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          disabled={Boolean(busy) || moveOpen}
          onClick={() => setMoveOpen(true)}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#27272a] text-[12px] font-semibold text-white active:bg-[#3f3f46] disabled:opacity-50"
        >
          {busy === "move" ? <Loader2 className="size-4 animate-spin" /> : <ArrowRightLeft className="size-4" />}
          Move
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || moveOpen}
          onClick={() => void handleDownload()}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#27272a] text-[12px] font-semibold text-white active:bg-[#3f3f46] disabled:opacity-50"
        >
          {busy === "download" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || moveOpen}
          onClick={() => setDeleteOpen(true)}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#dc2626] text-[12px] font-semibold text-white active:bg-[#b91c1c] disabled:opacity-50"
        >
          {busy === "delete" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Delete
        </button>
      </div>

      <DeleteAssetDialog
        open={deleteOpen}
        fileName={title}
        busy={busy === "delete"}
        onCancel={() => { if (busy !== "delete") setDeleteOpen(false) }}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>,
    document.body,
  )
}
