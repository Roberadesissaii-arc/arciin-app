"use client"

import { useState } from "react"
import { Folder, Loader2, Trash2 } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import type { FolderSummary } from "@/lib/types/folders"

export function MobileFolderActionsSheet({
  open,
  folder,
  onClose,
  onOpen,
  onDelete,
}: {
  open: boolean
  folder: FolderSummary | null
  onClose: () => void
  onOpen: () => void
  onDelete: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function handleClose() {
    if (busy) return
    setConfirming(false)
    onClose()
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    try {
      await onDelete()
      handleClose()
    } finally {
      setBusy(false)
    }
  }

  if (!folder) return null

  return (
    <MobileBottomSheet
      open={open}
      onClose={handleClose}
      title={folder.name}
      description={
        confirming
          ? "This removes the folder from the library. Files inside stay in the library."
          : `${folder.assetCount} file${folder.assetCount === 1 ? "" : "s"} in this folder`
      }
      ariaLabel="Folder actions"
    >
      <div className="flex flex-col gap-2">
        {!confirming ? (
          <>
            <button
              type="button"
              onClick={() => {
                onOpen()
                handleClose()
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#f7f7f7] text-[14px] font-semibold text-[#222222] active:bg-[#ececec]"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <Folder className="text-accent size-4" />
              Open folder
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#fef2f2] text-[14px] font-semibold text-[#b91c1c] active:opacity-90"
              style={{ border: "1px solid #fecaca" }}
            >
              <Trash2 className="size-4" />
              Delete folder
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#dc2626] text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete permanently
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="flex h-11 w-full items-center justify-center rounded-xl text-[14px] font-semibold text-[#717171] active:bg-[#f0f0f0]"
              style={{ border: "1px solid #e5e5e5" }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </MobileBottomSheet>
  )
}
