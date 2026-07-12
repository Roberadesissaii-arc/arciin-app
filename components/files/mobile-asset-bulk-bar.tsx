"use client"

import { useEffect } from "react"
import { ArrowRightLeft, Download, Share2, Trash2, X } from "lucide-react"

const BODY_CLASS = "arciin-mobile-bulkbar-open"

export function MobileAssetBulkBar({
  count,
  busy,
  canMove,
  onShare,
  onDownload,
  onMove,
  onDelete,
  onCancel,
}: {
  count: number
  busy?: boolean
  canMove: boolean
  onShare: () => void
  onDownload: () => void
  onMove: () => void
  onDelete: () => void
  onCancel: () => void
}) {
  // Hide the floating bottom nav while the action bar covers the bottom.
  useEffect(() => {
    document.body.classList.add(BODY_CLASS)
    return () => document.body.classList.remove(BODY_CLASS)
  }, [])

  if (count <= 0) return null

  return (
    <div
      className="mobile-bulk-bar-enter fixed inset-x-0 bottom-0 z-[120] rounded-t-3xl border-t border-[#e5e5e5] bg-white px-4 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+0.75rem))] pt-5 shadow-[0_-12px_48px_rgba(0,0,0,0.18)]"
    >
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[#717171] active:bg-[#f0f0f0] disabled:opacity-50"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Cancel selection"
        >
          <X className="size-4" />
        </button>
        <p className="min-w-0 flex-1 text-[13px] font-semibold text-[#222222]">
          {count} selected
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onShare}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[#222222] active:bg-[#f0f0f0] disabled:opacity-50"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Share selected"
        >
          <Share2 className="text-accent size-4" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDownload}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[#222222] active:bg-[#f0f0f0] disabled:opacity-50"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Download selected"
        >
          <Download className="text-accent size-4" />
        </button>
        {canMove ? (
          <button
            type="button"
            disabled={busy}
            onClick={onMove}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[#222222] active:bg-[#f0f0f0] disabled:opacity-50"
            style={{ border: "1px solid #e5e5e5" }}
            aria-label="Move selected"
          >
            <ArrowRightLeft className="text-accent size-4" />
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#dc2626] text-white active:bg-[#b91c1c] disabled:opacity-50"
          aria-label="Delete selected"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
