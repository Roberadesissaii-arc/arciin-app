"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { useConnection } from "@/components/providers/connection-provider"
import { createFolder } from "@/lib/api/folders"
import { formatApiError } from "@/lib/api/errors"
import { mobileInputClassMuted } from "@/lib/ui/mobile-input"
import { generateFolderName } from "@/lib/utils/generate-folder-name"

const inputStyle = { border: "1px solid #e5e5e5" } as const

export function MobileCreateFolderSheet({
  open,
  libraryId,
  libraryName,
  parentFolderId,
  parentFolderName,
  existingFolderNames = [],
  onClose,
  onCreated,
}: {
  open: boolean
  libraryId: string | null
  libraryName: string | null
  parentFolderId?: string | null
  parentFolderName?: string | null
  existingFolderNames?: string[]
  onClose: () => void
  onCreated: (folder?: import("@/lib/types/folders").FolderSummary) => void
}) {
  const { connection } = useConnection()
  const [name, setName] = useState(() => generateFolderName(existingFolderNames))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null as string | null)
  const existingKey = existingFolderNames.map((n) => n.trim().toLowerCase()).sort().join("\0")

  useEffect(() => {
    if (!open) return
    setName(generateFolderName(existingFolderNames))
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- regenerate when sibling names change
  }, [open, existingKey])

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
      const folder = await createFolder(connection, libraryId, {
        name: trimmed,
        parentFolderId: parentFolderId ?? null,
      })
      onCreated(folder)
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void handleSubmit()
                }
              }}
              className={mobileInputClassMuted}
              style={inputStyle}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setName(generateFolderName(existingFolderNames))}
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
          className="btn-accent-solid flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {saving ? "Creating…" : "Create folder"}
        </button>
      </div>
    </MobileBottomSheet>
  )
}
