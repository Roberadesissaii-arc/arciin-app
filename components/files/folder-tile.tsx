"use client"

import { Folder } from "lucide-react"

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
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col text-left active:opacity-90"
      aria-label={`Open folder ${folder.name}`}
    >
      <div className="relative w-full" style={{ aspectRatio: compact ? "1.05" : "1.15" }}>
        <div
          className="absolute left-[12%] top-0 h-[22%] w-[38%] rounded-t-lg"
          style={{
            background: "linear-gradient(180deg, #ffb899 0%, #ff6a33 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 top-[14%] overflow-hidden rounded-2xl rounded-tl-md"
          style={{
            background: "linear-gradient(165deg, #fff7f4 0%, #ffffff 42%, #fafafa 100%)",
            border: "1.5px solid rgba(255,79,18,0.22)",
            boxShadow: "0 4px 14px rgba(255,79,18,0.08)",
          }}
        >
          <div className="flex h-full flex-col items-center justify-center gap-1.5 px-2 pb-2 pt-1">
            <div
              className="flex size-9 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "rgba(255,79,18,0.12)",
                border: "1px solid rgba(255,79,18,0.2)",
              }}
            >
              <Folder className="size-4 text-[#ff4f12]" strokeWidth={2} />
            </div>
            <p className="line-clamp-2 w-full text-center text-[11px] font-semibold leading-tight text-[#222222]">
              {folder.name}
            </p>
            <p className="text-[10px] tabular-nums text-[#a0a0a0]">
              {folder.assetCount} file{folder.assetCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}
