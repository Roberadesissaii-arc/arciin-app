"use client"

import { createPortal } from "react-dom"
import { Loader2 } from "lucide-react"

type DeleteAssetDialogProps = {
  open: boolean
  fileName: string
  count?: number
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteAssetDialog({
  open,
  fileName,
  count = 1,
  busy,
  onCancel,
  onConfirm,
}: DeleteAssetDialogProps) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 px-6"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-asset-title"
        aria-describedby="delete-asset-desc"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
        style={{ border: "1px solid #e5e5e5" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="delete-asset-title"
          className="text-[17px] font-bold text-[#111111]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          {count > 1 ? `Delete ${count} files?` : "Delete file?"}
        </h2>
        <p id="delete-asset-desc" className="mt-2 text-[13px] leading-relaxed text-[#717171]">
          {count > 1 ? (
            <>
              <span className="font-medium text-[#222222]">{count} files</span> will be removed from
              your library. This cannot be undone.
            </>
          ) : (
            <>
              <span className="font-medium text-[#222222]">{fileName}</span> will be removed from your
              library. This cannot be undone.
            </>
          )}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex h-11 flex-1 items-center justify-center rounded-xl text-[14px] font-semibold text-[#717171] active:bg-[#f7f7f7] disabled:opacity-50"
            style={{ border: "1.5px solid #e5e5e5" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#dc2626] text-[14px] font-semibold text-white active:bg-[#b91c1c] disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
