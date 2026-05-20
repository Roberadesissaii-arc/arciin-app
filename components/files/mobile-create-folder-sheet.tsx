"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { useConnection } from "@/components/providers/connection-provider"
import { createFolder } from "@/lib/api/folders"
import { formatApiError } from "@/lib/api/errors"
import { generateFolderName } from "@/lib/utils/generate-folder-name"

const inputClass =
  "min-w-0 flex-1 rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none placeholder:text-[#a0a0a0]"
const inputStyle = { border: "1px solid #e5e5e5" } as const

export function MobileCreateFolderSheet({
  open,
  libraryId,
  libraryName,
  parentFolderId,
  parentFolderName,
  onClose,
  onCreated,
}: {
  open: boolean
  libraryId: string | null
  libraryName: string | null
  parentFolderId?: string | null
  parentFolderName?: string | null
  onClose: () => void
  onCreated: () => void
}) {
  const { connection } = useConnection()
  const [name, setName] = useState(() => generateFolderName())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(generateFolderName())
    setError(null)
  }, [open])

  async function handleSubmit() {
    if (!connection || !libraryId) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Folder name is required.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createFolder(connection, libraryId, {
        name: trimmed,
        parentFolderId: parentFolderId ?? null,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const locationHint = parentFolderName
    ? `Inside ${parentFolderName}`
    : libraryName
      ? `In ${libraryName}`
      : "In this library"

  return (
    <MobileBottomSheet
      open={open && Boolean(libraryId)}
      onClose={onClose}
      title="New folder"
      description={`${locationHint}. Name is auto-generated — tap refresh or type your own.`}
      ariaLabel="Create folder"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="folder-name" className="text-[12px] font-semibold text-[#717171]">
            Folder name
          </label>
          <div className="flex gap-2">
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              className={inputClass}
              style={inputStyle}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setName(generateFolderName())}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#717171] active:bg-[#ececec]"
              style={{ border: "1px solid #e5e5e5" }}
              aria-label="Generate new name"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
          {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}
        </div>

        <button
          type="button"
          disabled={saving || !libraryId}
          onClick={() => void handleSubmit()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff4f12] text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Creating…" : "Create folder"}
        </button>
      </div>
    </MobileBottomSheet>
  )
}
