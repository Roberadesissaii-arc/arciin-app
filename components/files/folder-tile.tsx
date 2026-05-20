"use client"

import { useEffect, useRef, useState } from "react"
import { Check, FolderOpen, Pencil, Trash2, X } from "lucide-react"

import type { FolderSummary } from "@/lib/types/folders"

export function FolderTile({
  folder,
  onOpen,
  onDelete,
  onRename,
}: {
  folder: FolderSummary
  onOpen: () => void
  onDelete: () => Promise<void>
  onRename: (newName: string) => Promise<void>
}) {
  const [mode, setMode] = useState<"idle" | "renaming" | "confirming">("idle")
  const [nameInput, setNameInput] = useState(folder.name)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === "renaming") {
      setNameInput(folder.name)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [mode, folder.name])

  async function commitRename() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === folder.name) { setMode("idle"); return }
    setBusy(true)
    try {
      await onRename(trimmed)
      setMode("idle")
    } finally {
      setBusy(false)
    }
  }

  async function commitDelete() {
    setBusy(true)
    try {
      await onDelete()
    } finally {
      setBusy(false)
      setMode("idle")
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {/* folder icon — tap to open */}
      <button
        type="button"
        onClick={onOpen}
        className="relative shrink-0 active:opacity-75"
        aria-label={`Open ${folder.name}`}
      >
        <svg width="40" height="34" viewBox="0 0 40 34" fill="none">
          {/* tab */}
          <path
            d="M2 8C2 6.9 2.9 6 4 6H15L18 9H36C37.1 9 38 9.9 38 11V30C38 31.1 37.1 32 36 32H4C2.9 32 2 31.1 2 30V8Z"
            fill="url(#ftab)"
          />
          {/* body */}
          <path
            d="M2 11C2 9.9 2.9 9 4 9H36C37.1 9 38 9.9 38 11V30C38 31.1 37.1 32 36 32H4C2.9 32 2 31.1 2 30V11Z"
            fill="url(#fbody)"
          />
          <defs>
            <linearGradient id="ftab" x1="2" y1="6" x2="38" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ff9a6c" />
              <stop offset="1" stopColor="#ff4f12" />
            </linearGradient>
            <linearGradient id="fbody" x1="2" y1="9" x2="38" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffb38a" />
              <stop offset="1" stopColor="#ff5c20" />
            </linearGradient>
          </defs>
        </svg>
        <FolderOpen className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-white/80" />
      </button>

      {/* name + count — tap to open */}
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-[14px] font-semibold text-[#222222]">{folder.name}</p>
        <p className="text-[11px] text-[#a0a0a0]">
          {folder.assetCount} item{folder.assetCount !== 1 ? "s" : ""}
        </p>
      </button>

      {/* ── idle: pencil + trash ───────────────────────────────── */}
      {mode === "idle" && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("renaming")}
            className="flex size-8 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#f0f0f0] active:text-[#222222]"
            aria-label="Rename folder"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMode("confirming")}
            className="flex size-8 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#fef2f2] active:text-[#dc2626]"
            aria-label="Delete folder"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── renaming: input + save/cancel ─────────────────────── */}
      {mode === "renaming" && (
        <div className="flex shrink-0 items-center gap-1">
          <input
            ref={inputRef}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitRename()
              if (e.key === "Escape") setMode("idle")
            }}
            disabled={busy}
            className="w-32 rounded-lg border border-[#e5e5e5] bg-[#f7f7f7] px-2 py-1 text-[13px] text-[#222222] outline-none focus:border-[#ff4f12]"
          />
          <button
            type="button"
            onClick={() => void commitRename()}
            disabled={busy || !nameInput.trim()}
            className="flex size-8 items-center justify-center rounded-xl text-[#ff4f12] active:bg-[#fff4f0] disabled:opacity-40"
            aria-label="Save name"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setMode("idle")}
            disabled={busy}
            className="flex size-8 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#f0f0f0]"
            aria-label="Cancel rename"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── confirming delete: confirm/cancel ─────────────────── */}
      {mode === "confirming" && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void commitDelete()}
            disabled={busy}
            className="rounded-lg bg-[#dc2626] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50 active:bg-[#b91c1c]"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setMode("idle")}
            disabled={busy}
            className="rounded-lg bg-[#f7f7f7] px-2.5 py-1 text-[11px] font-semibold text-[#717171] active:bg-[#ececec]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
