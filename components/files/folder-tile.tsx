"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Pencil, Trash2, X } from "lucide-react"
import { createPortal } from "react-dom"

import type { FolderSummary } from "@/lib/types/folders"

/* ── delete confirmation sheet (shared) ──────────────────────── */

function DeleteFolderSheet({
  folder,
  onClose,
  onDelete,
}: {
  folder: FolderSummary
  onClose: () => void
  onDelete: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function handleDelete() {
    setBusy(true)
    setError(null)
    try {
      await onDelete()
      onClose()
    } catch {
      setError("Could not delete folder. Try again.")
      setBusy(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-5 pt-5"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e0e0e0]" />

        {/* icon */}
        <div className="mb-4 flex flex-col items-center gap-3 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
          >
            <Trash2 className="size-6 text-[#dc2626]" />
          </div>
          <div>
            <p className="text-[17px] font-bold text-[#222222]">Delete folder?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#717171]">
              &ldquo;{folder.name}&rdquo; will be removed from the library.
              Files inside will stay in the library.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mb-3 text-center text-[12px] text-[#b91c1c]">{error}</p>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "#dc2626" }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete folder
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl py-3 text-[14px] font-semibold text-[#717171] active:bg-[#f0f0f0]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ── rename bottom sheet (shared) ────────────────────────────── */

export function RenameFolderSheet({
  folder,
  onClose,
  onRename,
}: {
  folder: FolderSummary
  onClose: () => void
  onRename: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(folder.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (mounted) setTimeout(() => inputRef.current?.focus(), 80)
  }, [mounted])

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === folder.name) { onClose(); return }
    setBusy(true)
    setError(null)
    try {
      await onRename(trimmed)
      onClose()
    } catch {
      setError("Could not rename folder. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-5 pt-5"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#e0e0e0]" />
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[17px] font-bold text-[#222222]">Rename folder</p>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-xl text-[#717171] active:bg-[#f7f7f7]">
            <X className="size-4" />
          </button>
        </div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">Folder name</label>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleSave() }}
          disabled={busy}
          className="mt-1.5 w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[14px] text-[#222222] outline-none focus:border-[#ff4f12]"
        />
        {error ? <p className="mt-2 text-[12px] text-[#b91c1c]">{error}</p> : null}
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void handleSave()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#ff4f12" }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </button>
      </div>
    </div>,
    document.body,
  )
}

/* ── list row tile (used in the "top 2" preview) ─────────────── */

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
  const [sheet, setSheet] = useState<"none" | "rename" | "delete">("none")
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* folder icon */}
        <button type="button" onClick={onOpen} className="shrink-0 active:opacity-75" aria-label={`Open ${folder.name}`}>
          <FolderSvg width={42} height={36} />
        </button>

        {/* name + count */}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[14px] font-semibold text-[#222222]">{folder.name}</p>
          <p className="text-[11px] text-[#a0a0a0]">{folder.assetCount} item{folder.assetCount !== 1 ? "s" : ""}</p>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setSheet("rename")}
            className="flex size-8 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#f0f0f0] active:text-[#222222]" aria-label="Rename">
            <Pencil className="size-3.5" />
          </button>
          <button type="button" onClick={() => setSheet("delete")}
            className="flex size-8 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#fef2f2] active:text-[#dc2626]" aria-label="Delete">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {mounted && sheet === "rename" && (
        <RenameFolderSheet folder={folder} onClose={() => setSheet("none")} onRename={onRename} />
      )}
      {mounted && sheet === "delete" && (
        <DeleteFolderSheet folder={folder} onClose={() => setSheet("none")} onDelete={onDelete} />
      )}
    </>
  )
}

/* ── big grid tile (used in "all folders" overlay) ───────────── */

export function FolderGridTile({
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
  const [sheet, setSheet] = useState<"none" | "rename" | "delete">("none")
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      <div className="flex flex-col">
        {/* folder graphic — tappable */}
        <button
          type="button"
          onClick={onOpen}
          className="group relative w-full active:scale-[0.97] active:opacity-90"
          style={{ aspectRatio: "1.1" }}
          aria-label={`Open ${folder.name}`}
        >
          {/* back depth layer */}
          <div
            className="absolute inset-x-[5%] bottom-0"
            style={{
              top: "18%",
              borderRadius: "18px 18px 18px 18px",
              borderTopLeftRadius: "4px",
              background: "linear-gradient(180deg, #ff9a6c 0%, #ff4f12 100%)",
            }}
            aria-hidden
          />
          {/* tab */}
          <div
            className="absolute z-10"
            style={{
              left: "5%", top: 0,
              width: "46%", height: "23%",
              borderRadius: "10px 10px 0 4px",
              background: "linear-gradient(180deg, #ffc9a0 0%, #ff6a33 60%, #ff4f12 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
            }}
            aria-hidden
          />
          {/* face */}
          <div
            className="absolute inset-x-0 z-20 overflow-hidden"
            style={{
              top: "11%", bottom: 0,
              borderRadius: "0 18px 18px 18px",
              borderTopLeftRadius: "4px",
              background: "linear-gradient(160deg, #fffdfb 0%, #ffffff 50%, #f5f5f5 100%)",
              border: "1.5px solid rgba(255,79,18,0.22)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,1)",
            }}
          >
            <p className="absolute left-3 right-3 top-2.5 line-clamp-2 text-left text-[12px] font-bold leading-tight text-[#222222]">
              {folder.name}
            </p>
            <span className="absolute bottom-2.5 right-3 text-[13px] font-bold tabular-nums text-[#ff4f12]">
              {folder.assetCount}
            </span>
          </div>
        </button>

        {/* action row below graphic */}
        <div className="mt-1.5 flex items-center justify-between px-0.5">
          <p className="truncate text-[11px] text-[#a0a0a0]">
            {folder.assetCount} item{folder.assetCount !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => setSheet("rename")}
              className="flex size-7 items-center justify-center rounded-lg text-[#b0b0b0] active:bg-[#f0f0f0] active:text-[#222222]" aria-label="Rename">
              <Pencil className="size-3" />
            </button>
            <button type="button" onClick={() => setSheet("delete")}
              className="flex size-7 items-center justify-center rounded-lg text-[#b0b0b0] active:bg-[#fef2f2] active:text-[#dc2626]" aria-label="Delete">
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {mounted && sheet === "rename" && (
        <RenameFolderSheet folder={folder} onClose={() => setSheet("none")} onRename={onRename} />
      )}
      {mounted && sheet === "delete" && (
        <DeleteFolderSheet folder={folder} onClose={() => setSheet("none")} onDelete={onDelete} />
      )}
    </>
  )
}

/* ── shared folder SVG icon ───────────────────────────────────── */

export function FolderSvg({ width = 42, height = 36 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 42 36" fill="none">
      <path d="M2 9C2 7.9 2.9 7 4 7H16L19 10H38C39.1 10 40 10.9 40 12V32C40 33.1 39.1 34 38 34H4C2.9 34 2 33.1 2 32V9Z" fill="url(#ft3)" />
      <path d="M2 12C2 10.9 2.9 10 4 10H38C39.1 10 40 10.9 40 12V32C40 33.1 39.1 34 38 34H4C2.9 34 2 33.1 2 32V12Z" fill="url(#fb3)" />
      <defs>
        <linearGradient id="ft3" x1="2" y1="7" x2="40" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffb07a" /><stop offset="1" stopColor="#ff4f12" />
        </linearGradient>
        <linearGradient id="fb3" x1="2" y1="10" x2="40" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffa060" /><stop offset="1" stopColor="#e84000" />
        </linearGradient>
      </defs>
    </svg>
  )
}
