"use client"

import type { FolderSummary } from "@/lib/types/folders"

export function FolderTile({
  folder,
  onOpen,
  compact,
}: {
  folder: FolderSummary
  onOpen: () => void
  compact?: boolean
}) {
  const tabW = compact ? "44%" : "46%"
  const tabH = compact ? "22%" : "24%"
  const bodyTop = compact ? "11%" : "12%"

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col text-left active:scale-[0.98] active:opacity-95"
      aria-label={`Open folder ${folder.name}`}
    >
      <div className="relative w-full" style={{ aspectRatio: compact ? "1" : "1.05" }}>
        {/* Depth layer */}
        <div
          className="absolute inset-x-[4%] bottom-0 rounded-2xl rounded-tl-md"
          style={{
            top: "20%",
            background: "linear-gradient(180deg, #ff9a6c 0%, #ff4f12 100%)",
            boxShadow: "0 8px 18px rgba(255,79,18,0.22)",
          }}
          aria-hidden
        />

        {/* Tab — left-aligned */}
        <div
          className="absolute z-10 rounded-t-lg rounded-br-sm"
          style={{
            left: "4%",
            top: 0,
            width: tabW,
            height: tabH,
            background: "linear-gradient(180deg, #ffcba8 0%, #ff6a33 50%, #ff4f12 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 6px rgba(255,79,18,0.25)",
          }}
          aria-hidden
        />

        {/* Main folder face */}
        <div
          className="absolute inset-x-0 z-20 overflow-hidden rounded-2xl rounded-tl-md"
          style={{
            top: bodyTop,
            bottom: 0,
            background: "linear-gradient(160deg, #fffdfb 0%, #ffffff 45%, #f4f4f5 100%)",
            border: "1.5px solid rgba(255,79,18,0.24)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,1), 0 3px 10px rgba(0,0,0,0.05)",
          }}
        >
          <p className="absolute left-2.5 top-2 right-6 line-clamp-2 text-left text-[11px] font-bold leading-tight text-[#222222]">
            {folder.name}
          </p>
          <span
            className="absolute bottom-2 right-2.5 text-[12px] font-bold tabular-nums text-[#ff4f12]"
            aria-label={`${folder.assetCount} files`}
          >
            {folder.assetCount}
          </span>
        </div>
      </div>
    </button>
  )
}
