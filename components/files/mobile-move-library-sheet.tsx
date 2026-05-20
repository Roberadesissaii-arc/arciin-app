"use client"

import { Loader2 } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import type { LibrarySummary } from "@/lib/types/assets"

export function MobileMoveLibrarySheet({
  open,
  libraries,
  busy,
  onClose,
  onSelect,
}: {
  open: boolean
  libraries: LibrarySummary[]
  busy: boolean
  onClose: () => void
  onSelect: (libraryId: string) => void
}) {
  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="Move to library"
      description="Choose a destination library for this file."
      ariaLabel="Move to library"
    >
      <div className="flex flex-col gap-1.5">
        {libraries.length === 0 ? (
          <p className="text-[13px] text-[#717171]">No other libraries available.</p>
        ) : (
          libraries.map((lib) => (
            <button
              key={lib.id}
              type="button"
              disabled={busy}
              onClick={() => onSelect(lib.id)}
              className="flex items-center justify-between rounded-xl bg-[#f7f7f7] px-4 py-3 text-left text-[14px] font-semibold text-[#222222] active:bg-[#ececec] disabled:opacity-50"
              style={{ border: "1px solid #e5e5e5" }}
            >
              {lib.name}
              <span className="text-[11px] font-medium tabular-nums text-[#a0a0a0]">
                {lib.assetCount}
              </span>
            </button>
          ))
        )}
        {busy ? (
          <p className="flex items-center justify-center gap-2 py-2 text-[12px] text-[#717171]">
            <Loader2 className="size-4 animate-spin" />
            Moving…
          </p>
        ) : null}
      </div>
    </MobileBottomSheet>
  )
}
