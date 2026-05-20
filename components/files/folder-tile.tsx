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
  const tabH = compact ? "20%" : "24%"
  const bodyTop = compact ? "12%" : "14%"

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col text-left active:scale-[0.98] active:opacity-95"
      aria-label={`Open folder ${folder.name}`}
    >
      <div className="relative w-full" style={{ aspectRatio: compact ? "0.92" : "0.88" }}>
        <div
          className="absolute inset-x-[6%] bottom-0 top-[18%] rounded-2xl rounded-tl-sm"
          style={{
            background: "linear-gradient(180deg, #ffd4c4 0%, #ff8f5c 100%)",
            boxShadow: "0 6px 16px rgba(255,79,18,0.18)",
          }}
          aria-hidden
        />
        <div
          className="absolute z-10 rounded-t-xl"
          style={{
            left: "10%",
            top: 0,
            width: "42%",
            height: tabH,
            background: "linear-gradient(180deg, #ffc9b0 0%, #ff6a33 55%, #ff4f12 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.45), 0 2px 4px rgba(255,79,18,0.2)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-x-0 z-20 overflow-hidden rounded-2xl rounded-tl-lg"
          style={{
            top: bodyTop,
            bottom: 0,
            background: "linear-gradient(165deg, #fffaf8 0%, #ffffff 38%, #f8f8f8 100%)",
            border: "1.5px solid rgba(255,79,18,0.28)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex h-full flex-col items-center justify-end gap-0.5 px-2 pb-2.5 pt-3">
            <div
              className="mb-1 flex size-8 items-center justify-center rounded-lg"
              style={{
                background:
                  "linear-gradient(145deg, rgba(255,79,18,0.14) 0%, rgba(255,79,18,0.06) 100%)",
                border: "1px solid rgba(255,79,18,0.15)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4 text-[#ff4f12]"
                fill="currentColor"
                aria-hidden
              >
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
              </svg>
            </div>
            <p className="line-clamp-2 w-full text-center text-[11px] font-bold leading-tight text-[#222222]">
              {folder.name}
            </p>
            <p className="text-[10px] font-medium tabular-nums text-[#a0a0a0]">
              {folder.assetCount} file{folder.assetCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}
