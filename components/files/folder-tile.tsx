"use client"

import { useEffect, useId, useRef, useState } from "react"
import { FolderLock, Loader2, Pencil, Trash2 } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { mobileInputClassMuted } from "@/lib/ui/mobile-input"
import type { FolderSummary } from "@/lib/types/folders"

const inputStyle = { border: "1px solid #e5e5e5" } as const

/* ── delete confirmation sheet ─────────────────────────────── */

function DeleteFolderSheet({
  open,
  folder,
  onClose,
  onDelete,
}: {
  open: boolean
  folder: FolderSummary
  onClose: () => void
  onDelete: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(false)
  }, [open])

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

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="Delete folder?"
      ariaLabel="Delete folder"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
          >
            <Trash2 className="size-6 text-[#dc2626]" />
          </div>
          <p className="text-[13px] leading-relaxed text-[#717171]">
            &ldquo;{folder.name}&rdquo; will be removed from the library. Files inside will stay in
            the library.
          </p>
        </div>

        {error ? <p className="text-center text-[12px] text-[#b91c1c]">{error}</p> : null}

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
    </MobileBottomSheet>
  )
}

/* ── rename bottom sheet ─────────────────────────────────────── */

export function RenameFolderSheet({
  open,
  folder,
  onClose,
  onRename,
}: {
  open: boolean
  folder: FolderSummary
  onClose: () => void
  onRename: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(folder.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName(folder.name)
    setError(null)
    setBusy(false)
    const id = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(id)
  }, [open, folder.name])

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === folder.name) {
      onClose()
      return
    }
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

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="Rename folder"
      ariaLabel="Rename folder"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rename-folder-name" className="text-[12px] font-semibold text-[#717171]">
            Folder name
          </label>
          <input
            ref={inputRef}
            id="rename-folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave()
            }}
            disabled={busy}
            className={mobileInputClassMuted}
            style={inputStyle}
            autoComplete="off"
          />
          {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}
        </div>
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void handleSave()}
          className="btn-accent-solid flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </button>
      </div>
    </MobileBottomSheet>
  )
}

/* ── list row tile (used in the "top 2" preview) ─────────────── */

function folderNeedsUnlock(folder: FolderSummary) {
  return Boolean(folder.isLocked && !folder.accessGranted)
}

export function FolderTile({
  folder,
  onOpen,
  onDelete,
  onRename,
  onRequestUnlock,
  onLockFolder,
  onRemoveLock,
}: {
  folder: FolderSummary
  onOpen: () => void
  onDelete: () => Promise<void>
  onRename: (newName: string) => Promise<void>
  onRequestUnlock?: () => void
  onLockFolder?: () => void
  onRemoveLock?: () => void
}) {
  const tryOpen = () => {
    if (folderNeedsUnlock(folder) && onRequestUnlock) {
      onRequestUnlock()
      return
    }
    onOpen()
  }
  const [sheet, setSheet] = useState<"none" | "rename" | "delete">("none")

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <button
          type="button"
          onClick={tryOpen}
          className="relative shrink-0 active:opacity-75"
          aria-label={`Open ${folder.name}`}
        >
          <FolderSvg width={42} height={36} />
          {folder.isLocked ? (
            <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-[#e5e5e5]">
              <FolderLock className="text-accent size-3" aria-hidden />
            </span>
          ) : null}
        </button>

        <button type="button" onClick={tryOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[14px] font-semibold text-[#222222]">{folder.name}</p>
          <p className="text-[11px] text-[#a0a0a0]">
            {folder.assetCount} item{folder.assetCount !== 1 ? "s" : ""}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          {folder.isLocked && onRemoveLock ? (
            <button
              type="button"
              onClick={onRemoveLock}
              className="text-accent flex size-8 items-center justify-center rounded-xl active:bg-accent-soft"
              aria-label="Remove lock"
            >
              <FolderLock className="size-3.5" />
            </button>
          ) : onLockFolder ? (
            <button
              type="button"
              onClick={onLockFolder}
              className="flex size-8 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#f0f0f0]"
              aria-label="Lock folder"
            >
              <FolderLock className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSheet("rename")}
            className="flex size-8 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#f0f0f0] active:text-[#222222]"
            aria-label="Rename"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setSheet("delete")}
            className="flex size-8 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#fef2f2] active:text-[#dc2626]"
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <RenameFolderSheet
        open={sheet === "rename"}
        folder={folder}
        onClose={() => setSheet("none")}
        onRename={onRename}
      />
      <DeleteFolderSheet
        open={sheet === "delete"}
        folder={folder}
        onClose={() => setSheet("none")}
        onDelete={onDelete}
      />
    </>
  )
}

/* ── big grid tile (used in "all folders" overlay) ───────────── */

export function FolderGridTile({
  folder,
  onOpen,
  onDelete,
  onRename,
  onRequestUnlock,
  onLockFolder,
  onRemoveLock,
}: {
  folder: FolderSummary
  onOpen: () => void
  onDelete: () => Promise<void>
  onRename: (newName: string) => Promise<void>
  onRequestUnlock?: () => void
  onLockFolder?: () => void
  onRemoveLock?: () => void
}) {
  const tryOpen = () => {
    if (folderNeedsUnlock(folder) && onRequestUnlock) {
      onRequestUnlock()
      return
    }
    onOpen()
  }
  const [sheet, setSheet] = useState<"none" | "rename" | "delete">("none")

  return (
    <>
      <div className="flex flex-col">
        <button
          type="button"
          onClick={tryOpen}
          className="group relative w-full active:scale-[0.97] active:opacity-90"
          style={{ aspectRatio: "1.1" }}
          aria-label={`Open ${folder.name}`}
        >
          <div
            className="absolute inset-x-[5%] bottom-0"
            style={{
              top: "18%",
              borderRadius: "18px 18px 18px 18px",
              borderTopLeftRadius: "4px",
              background:
                "linear-gradient(180deg, var(--arciin-folder-glow-from, #ff9a6c) 0%, var(--arciin-folder-glow-to, #ff4f12) 100%)",
              opacity: 0.35,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <FolderSvg width={72} height={62} />
            {folder.isLocked ? (
              <span className="absolute bottom-[18%] right-[18%] flex size-7 items-center justify-center rounded-lg bg-white shadow-md ring-1 ring-[#e5e5e5]">
                <FolderLock className="text-accent size-3.5" aria-hidden />
              </span>
            ) : null}
          </div>
        </button>

        <div className="mt-2 flex items-start justify-between gap-1 px-0.5">
          <button type="button" onClick={tryOpen} className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-semibold text-[#222222]">{folder.name}</p>
            <p className="text-[10px] text-[#a0a0a0]">
              {folder.assetCount} item{folder.assetCount !== 1 ? "s" : ""}
            </p>
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            {folder.isLocked && onRemoveLock ? (
              <button
                type="button"
                onClick={onRemoveLock}
                className="text-accent flex size-7 items-center justify-center rounded-lg active:bg-accent-soft"
                aria-label="Remove lock"
              >
                <FolderLock className="size-3" />
              </button>
            ) : onLockFolder ? (
              <button
                type="button"
                onClick={onLockFolder}
                className="flex size-7 items-center justify-center rounded-lg text-[#b0b0b0] active:bg-[#f0f0f0]"
                aria-label="Lock folder"
              >
                <FolderLock className="size-3" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setSheet("rename")}
              className="flex size-7 items-center justify-center rounded-lg text-[#b0b0b0] active:bg-[#f0f0f0] active:text-[#222222]"
              aria-label="Rename"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              onClick={() => setSheet("delete")}
              className="flex size-7 items-center justify-center rounded-lg text-[#b0b0b0] active:bg-[#fef2f2] active:text-[#dc2626]"
              aria-label="Delete"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </div>

      <RenameFolderSheet
        open={sheet === "rename"}
        folder={folder}
        onClose={() => setSheet("none")}
        onRename={onRename}
      />
      <DeleteFolderSheet
        open={sheet === "delete"}
        folder={folder}
        onClose={() => setSheet("none")}
        onDelete={onDelete}
      />
    </>
  )
}

/* ── shared folder SVG icon ───────────────────────────────────── */

export function FolderSvg({ width = 42, height = 36 }: { width?: number; height?: number }) {
  const uid = useId().replace(/:/g, "")
  const tabGradientId = `folder-tab-${uid}`
  const bodyGradientId = `folder-body-${uid}`

  return (
    <svg width={width} height={height} viewBox="0 0 42 36" fill="none" aria-hidden>
      <path
        d="M2 9C2 7.9 2.9 7 4 7H16L19 10H38C39.1 10 40 10.9 40 12V32C40 33.1 39.1 34 38 34H4C2.9 34 2 33.1 2 32V9Z"
        fill={`url(#${tabGradientId})`}
      />
      <path
        d="M2 12C2 10.9 2.9 10 4 10H38C39.1 10 40 10.9 40 12V32C40 33.1 39.1 34 38 34H4C2.9 34 2 33.1 2 32V12Z"
        fill={`url(#${bodyGradientId})`}
      />
      <defs>
        <linearGradient
          id={tabGradientId}
          x1="2"
          y1="7"
          x2="40"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--arciin-folder-tab-light, #ffb07a)" />
          <stop offset="1" stopColor="var(--arciin-folder-tab-dark, #ff4f12)" />
        </linearGradient>
        <linearGradient
          id={bodyGradientId}
          x1="2"
          y1="10"
          x2="40"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--arciin-folder-body-light, #ffa060)" />
          <stop offset="1" stopColor="var(--arciin-folder-body-dark, #e84000)" />
        </linearGradient>
      </defs>
    </svg>
  )
}
