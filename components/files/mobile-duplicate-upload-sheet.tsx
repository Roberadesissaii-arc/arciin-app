"use client"

import { useMemo, useState } from "react"
import { Copy, FileWarning, RefreshCw, X } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import type {
  DuplicateUploadConflict,
  DuplicateUploadResolution,
} from "@/lib/uploads/upload-duplicate-types"

const RESOLUTIONS: { value: DuplicateUploadResolution; label: string }[] = [
  { value: "keep-both", label: "Keep both" },
  { value: "replace", label: "Replace" },
  { value: "skip", label: "Cancel" },
]

function ResolutionButton({
  value,
  selected,
  onClick,
}: {
  value: DuplicateUploadResolution
  selected: boolean
  onClick: () => void
}) {
  const cfg = RESOLUTIONS.find((r) => r.value === value)!
  const Icon = value === "replace" ? RefreshCw : value === "keep-both" ? Copy : X

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-colors ${
        selected
          ? "border-[var(--arciin-accent-ring,rgba(255,79,18,0.35))] bg-[var(--arciin-accent-wash,rgba(255,79,18,0.08))] text-[#222222]"
          : "border-[#e5e5e5] bg-white text-[#717171] active:bg-[#f7f7f7]"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      <span className="text-[11px] font-semibold leading-none">{cfg.label}</span>
    </button>
  )
}

export function MobileDuplicateUploadSheet({
  conflicts,
  onResolve,
  onCancel,
}: {
  conflicts: DuplicateUploadConflict[]
  onResolve: (resolved: DuplicateUploadConflict[]) => void
  onCancel: () => void
}) {
  const groups = useMemo(() => {
    const map = new Map<string, DuplicateUploadConflict[]>()
    for (const c of conflicts) {
      const list = map.get(c.file.name) ?? []
      list.push(c)
      map.set(c.file.name, list)
    }
    return [...map.entries()].map(([filename, items]) => ({ filename, items }))
  }, [conflicts])

  const [resolutions, setResolutions] = useState<Record<string, DuplicateUploadResolution>>(() => {
    const init: Record<string, DuplicateUploadResolution> = {}
    for (const g of groups) {
      init[g.filename] = "keep-both"
    }
    return init
  })

  function setOne(filename: string, res: DuplicateUploadResolution) {
    setResolutions((prev) => ({ ...prev, [filename]: res }))
  }

  function handleConfirm() {
    onResolve(
      conflicts.map((c) => ({
        ...c,
        resolution: resolutions[c.file.name] ?? "keep-both",
      })),
    )
  }

  const uniqueNames = groups.length
  const totalCopies = conflicts.length

  return (
    <MobileBottomSheet
      open
      onClose={onCancel}
      title={uniqueNames === 1 ? "File already exists" : "Files already exist"}
      description={
        totalCopies === 1
          ? "This file is already in this library. Replace it, keep both with a new name (e.g. car 1), or cancel."
          : `${totalCopies} uploads match existing names. Choose what to do for each.`
      }
      panelClassName="max-h-[min(88dvh,720px)]"
    >
      <div className="mb-4 flex items-start gap-3 rounded-xl bg-[#f7f7f7] px-3 py-3" style={{ border: "1px solid #e5e5e5" }}>
        <FileWarning className="text-accent mt-0.5 size-5 shrink-0" />
        <p className="text-[12px] leading-relaxed text-[#717171]">
          <span className="font-semibold text-[#222222]">Keep both</span> saves a numbered copy
          automatically — for example <span className="font-mono">car 1.jpg</span>.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const selected = resolutions[group.filename] ?? "keep-both"
          return (
            <div
              key={group.filename}
              className="rounded-xl bg-[#f7f7f7] px-3 py-3"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <p className="truncate text-[13px] font-medium text-[#222222]" title={group.filename}>
                {group.filename}
                {group.items.length > 1 ? (
                  <span className="ml-1.5 font-normal text-[#a0a0a0]">
                    ({group.items.length} copies)
                  </span>
                ) : null}
              </p>
              <div className="mt-2.5 flex gap-2">
                {RESOLUTIONS.map((r) => (
                  <ResolutionButton
                    key={r.value}
                    value={r.value}
                    selected={selected === r.value}
                    onClick={() => setOne(group.filename, r.value)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white text-[14px] font-semibold text-[#444444]"
        >
          Cancel all
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="btn-accent-solid flex h-11 flex-1 items-center justify-center rounded-xl text-[14px] font-semibold"
        >
          Continue
        </button>
      </div>
    </MobileBottomSheet>
  )
}
