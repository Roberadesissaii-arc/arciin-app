"use client"

import { useEffect, useState } from "react"
import { Folder, Loader2, Plus } from "lucide-react"

import { MobileCreateFolderSheet } from "@/components/files/mobile-create-folder-sheet"
import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { useConnection } from "@/components/providers/connection-provider"
import { listFolders } from "@/lib/api/folders"
import { formatApiError } from "@/lib/api/errors"
import type { FolderSummary } from "@/lib/types/folders"

export function MobileMoveFolderSheet({
  open,
  libraryId,
  libraryName,
  currentFolderId,
  assetFolderId,
  busy,
  onClose,
  onSelect,
}: {
  open: boolean
  libraryId: string
  libraryName: string
  currentFolderId?: string | null
  assetFolderId?: string | null
  busy: boolean
  onClose: () => void
  onSelect: (folderId: string | null) => void
}) {
  const { connection } = useConnection()
  const [folders, setFolders] = useState<FolderSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (!open || !connection) return
    setLoading(true)
    setError(null)
    void listFolders(connection, libraryId)
      .then((list) => {
        const parentId = currentFolderId ?? null
        const scoped = parentId
          ? list.filter((f) => f.parentFolderId === parentId)
          : list.filter((f) => !f.parentFolderId)
        setFolders(scoped)
      })
      .catch((err) => setError(formatApiError(err)))
      .finally(() => setLoading(false))
  }, [open, connection, libraryId, currentFolderId])

  function reloadFolders() {
    if (!connection) return
    void listFolders(connection, libraryId).then((list) => {
      const parentId = currentFolderId ?? null
      const scoped = parentId
        ? list.filter((f) => f.parentFolderId === parentId)
        : list.filter((f) => !f.parentFolderId)
      setFolders(scoped)
    })
  }

  const showLibraryRoot = Boolean(assetFolderId)

  return (
    <>
      <MobileBottomSheet
        open={open}
        onClose={onClose}
        title={`Move within ${libraryName}`}
        description="Files stay in this library. Choose a folder here, or create one below."
        ariaLabel="Move within library"
      >
        <div className="flex flex-col gap-2">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-6 text-[13px] text-[#717171]">
              <Loader2 className="size-4 animate-spin" />
              Loading folders…
            </p>
          ) : null}
          {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}

          {!loading ? (
            <>
              {showLibraryRoot ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSelect(null)}
                  className="flex items-center gap-3 rounded-xl bg-[#f7f7f7] px-4 py-3 text-left text-[14px] font-semibold text-[#222222] active:bg-[#ececec] disabled:opacity-50"
                  style={{ border: "1px solid #e5e5e5" }}
                >
                  <Folder className="text-accent size-4" />
                  Library root (no folder)
                </button>
              ) : null}

              {folders.length > 0 ? (
                <ul className="flex max-h-[min(50vh,320px)] flex-col gap-1.5 overflow-y-auto scrollbar-hide">
                  {folders.map((folder) => {
                    const isCurrent = folder.id === assetFolderId
                    return (
                      <li key={folder.id}>
                        <button
                          type="button"
                          disabled={busy || isCurrent}
                          onClick={() => onSelect(folder.id)}
                          className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left text-[14px] font-medium text-[#222222] active:bg-[#f7f7f7] disabled:opacity-50"
                          style={{ border: "1px solid #e5e5e5" }}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Folder className="text-accent size-4 shrink-0" />
                            <span className="truncate">{folder.name}</span>
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-[#a0a0a0]">
                            {isCurrent ? "Current" : folder.assetCount}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div
                  className="rounded-xl px-4 py-5 text-center"
                  style={{ backgroundColor: "#f7f7f7", border: "1px solid #e5e5e5" }}
                >
                  <p className="text-[13px] font-semibold text-[#222222]">No folders yet</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
                    {currentFolderId
                      ? "No subfolders here. Use library root above, or create a subfolder below."
                      : `There are no folders in ${libraryName}. Create one below, then your file will move into it.`}
                  </p>
                </div>
              )}

              <div className="mt-2 border-t border-[#ececec] pt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCreateOpen(true)}
                  className="text-accent flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed bg-accent-soft text-[14px] font-semibold active:opacity-80 disabled:opacity-50"
                  style={{ borderColor: "var(--arciin-accent-ring, rgba(255, 79, 18, 0.25))" }}
                >
                  <Plus className="size-4" />
                  Create folder
                </button>
              </div>
            </>
          ) : null}

          {busy ? (
            <p className="flex items-center justify-center gap-2 py-1 text-[12px] text-[#717171]">
              <Loader2 className="size-4 animate-spin" />
              Moving…
            </p>
          ) : null}
        </div>
      </MobileBottomSheet>

      <MobileCreateFolderSheet
        open={createOpen}
        libraryId={libraryId}
        libraryName={libraryName}
        parentFolderId={currentFolderId ?? null}
        parentFolderName={null}
        onClose={() => setCreateOpen(false)}
        onCreated={(folder) => {
          reloadFolders()
          setCreateOpen(false)
          if (folder) onSelect(folder.id)
        }}
      />
    </>
  )
}
