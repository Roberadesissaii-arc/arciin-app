"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, CloudUpload, Folder, Loader2, RefreshCw, Search, X } from "lucide-react"

import { useFilesChrome } from "@/components/files/files-chrome-context"
import { AssetThumbnail } from "@/components/files/asset-thumbnail"
import { FolderTile } from "@/components/files/folder-tile"
import { AssetViewer } from "@/components/files/asset-viewer"
import { MobileCreateFolderSheet } from "@/components/files/mobile-create-folder-sheet"
import { useConnection } from "@/components/providers/connection-provider"
import { getAssets } from "@/lib/api/assets"
import { formatApiError } from "@/lib/api/errors"
import { deleteFolder, listFolders, renameFolder } from "@/lib/api/folders"
import { listLibraries } from "@/lib/api/libraries"
import { uploadFile } from "@/lib/api/uploads"
import { classifyFile, filterIdForMediaType } from "@/lib/files/classify-file"
import {
  filesCacheKey,
  isFilesCacheStale,
  readFilesCache,
  removeAssetFromAllCaches,
  writeFilesCache,
} from "@/lib/files/files-cache"
import { evictThumbnail } from "@/lib/files/thumbnail-cache"
import {
  assetCountForFilter,
  findLibraryBySlug,
  libraryIdForFilter,
  librarySlugForFilter,
  type FilesFilterId,
} from "@/lib/files/library-helpers"
import type { AssetSummary, LibrarySummary } from "@/lib/types/assets"
import type { FolderSummary } from "@/lib/types/folders"
import { FILES_FILTERS } from "@/lib/files/filter-config"
import { formatBytes } from "@/lib/utils/format-bytes"

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl bg-white p-2"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <div className="aspect-square rounded-xl bg-[#ececec]" />
          <div className="mt-2 h-3 w-3/4 rounded bg-[#f0f0f0]" />
          <div className="mt-1.5 h-2 w-1/2 rounded bg-[#f5f5f5]" />
        </div>
      ))}
    </div>
  )
}

function SectionPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-10"
      style={{ border: "1px solid #e5e5e5" }}
    >
      <div
        className="flex size-14 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: "rgba(255,79,18,0.08)",
          border: "1px solid rgba(255,79,18,0.18)",
        }}
      >
        <Icon className="size-7 text-[#ff4f12]" strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-center text-[14px] font-semibold text-[#222222]">{title}</p>
      <p className="mt-1 max-w-[220px] text-center text-[12px] leading-relaxed text-[#a0a0a0]">
        {description}
      </p>
    </div>
  )
}

export function FilesPage() {
  const { connection, ready } = useConnection()
  const { setChrome } = useFilesChrome()
  const inputRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState<FilesFilterId>("all")
  const [folderId, setFolderId] = useState<string | null>(null)
  const [libraries, setLibraries] = useState<LibrarySummary[]>([])
  const [folders, setFolders] = useState<FolderSummary[]>([])
  const [assets, setAssets] = useState<AssetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadName, setUploadName] = useState<string | null>(null)
  const [uploadNotice, setUploadNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [allFoldersOpen, setAllFoldersOpen] = useState(false)
  const [hasCache, setHasCache] = useState(false)

  const libraryScoped = filter !== "all"

  const currentFolder = useMemo(
    () => (folderId ? folders.find((f) => f.id === folderId) : null),
    [folderId, folders],
  )

  const visibleFolders = useMemo(() => {
    if (!libraryScoped) return []
    if (folderId) return folders.filter((f) => f.parentFolderId === folderId)
    return folders.filter((f) => !f.parentFolderId)
  }, [folders, folderId, libraryScoped])

  const applyCache = useCallback((cached: ReturnType<typeof readFilesCache>) => {
    if (!cached) return false
    setLibraries(cached.libraries)
    setAssets(cached.assets)
    if (cached.folders) setFolders(cached.folders)
    setHasCache(true)
    setLoading(false)
    return true
  }, [])

  const load = useCallback(
    async (
      signal?: AbortSignal,
      isRefresh = false,
      opts?: { filter?: FilesFilterId; folderId?: string | null },
    ) => {
      if (!connection) return
      const activeFilter = opts?.filter ?? filter
      const activeFolderId = opts?.folderId !== undefined ? opts.folderId : folderId
      const scoped = activeFilter !== "all"
      const libId = libraryIdForFilter(libraries, activeFilter)

      const cacheKey = filesCacheKey(connection.apiBaseUrl, activeFilter, activeFolderId)
      const cached = readFilesCache(cacheKey)

      if (!isRefresh && cached) {
        applyCache(cached)
        if (!isFilesCacheStale(cached)) return
        setRefreshing(true)
      } else if (isRefresh) {
        setRefreshing(true)
      } else if (!cached) {
        setLoading(true)
        setHasCache(false)
      }

      setError(null)

      try {
        const libs = libraries.length ? libraries : await listLibraries(connection, signal)
        if (signal?.aborted) return

        const resolvedLibId = libraryIdForFilter(libs, activeFilter)
        let folderList: FolderSummary[] = []
        if (scoped && resolvedLibId) {
          folderList = await listFolders(connection, resolvedLibId, signal)
        }
        if (signal?.aborted) return

        let list: AssetSummary[] = []
        if (scoped && resolvedLibId && activeFolderId) {
          list = await getAssets(connection, { libraryId: resolvedLibId, folderId: activeFolderId }, signal)
        } else if (scoped && resolvedLibId) {
          const raw = await getAssets(connection, { libraryId: resolvedLibId }, signal)
          list = raw.filter((a) => !a.folderId)
        } else {
          list = await getAssets(connection, {}, signal)
        }

        if (signal?.aborted) return

        writeFilesCache(cacheKey, { libraries: libs, assets: list, folders: folderList })
        setLibraries(libs)
        setFolders(folderList)
        setAssets(list)
        setHasCache(true)
      } catch (err) {
        if (!signal?.aborted && !cached) setError(formatApiError(err))
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [applyCache, connection, filter, folderId, libraries],
  )

  useEffect(() => {
    if (!ready || !connection) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection, load])

  const changeFilter = useCallback(
    (id: FilesFilterId) => {
      setFilter(id)
      setFolderId(null)
      void load(undefined, false, { filter: id, folderId: null })
    },
    [load],
  )

  const openFolder = useCallback(
    (id: string) => {
      setFolderId(id)
      void load(undefined, false, { folderId: id })
    },
    [load],
  )

  const handleDeleteFolder = useCallback(async (id: string) => {
    if (!connection) return
    await deleteFolder(connection, id)
    setFolders((prev) => prev.filter((f) => f.id !== id))
    if (folderId === id) setFolderId(null)
    void load(undefined, true)
  }, [connection, folderId, load])

  const handleRenameFolder = useCallback(async (id: string, name: string) => {
    if (!connection) return
    const updated = await renameFolder(connection, id, name)
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name: updated.name } : f))
  }, [connection])

  const goToLibraryRoot = useCallback(() => {
    setFolderId(null)
    void load(undefined, false, { folderId: null })
  }, [load])

  async function handleFilesSelected(fileList: FileList | null) {
    if (!connection || !fileList?.length) return
    const files = Array.from(fileList)
    setUploading(true)
    setError(null)
    setUploadNotice(null)

    const forceInbox =
      filter === "inbox" ? libraryIdForFilter(libraries, "inbox") : undefined

    let lastDestination = ""
    let reloadFilter: FilesFilterId = filter
    const reloadFolderId = folderId

    try {
      for (const file of files) {
        const hint = classifyFile(file)
        setUploadName(`${file.name} → ${hint.toLowerCase()}`)
        setUploadProgress(0)

        const result = await uploadFile(connection, file, {
          ...(forceInbox ? { targetLibraryId: forceInbox } : {}),
          ...(folderId ? { targetFolderId: folderId } : {}),
          onProgress: setUploadProgress,
        })

        const detected = result.detectedMediaType ?? hint
        const destName = result.targetLibrary?.name
        lastDestination = destName
          ? `${destName} (${detected.toLowerCase()})`
          : detected.toLowerCase()

        if (result.detectedMediaType) {
          const nextFilter = filterIdForMediaType(result.detectedMediaType)
          reloadFilter = filter === "all" ? "all" : nextFilter
          if (reloadFilter !== filter) setFilter(reloadFilter)
        }
      }

      setUploadNotice(
        files.length === 1
          ? `Uploaded to ${lastDestination}.`
          : `${files.length} files uploaded.`,
      )
      setTimeout(() => setUploadNotice(null), 4000)

      await load(undefined, true, { filter: reloadFilter, folderId: reloadFolderId })
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setUploading(false)
      setUploadProgress(null)
      setUploadName(null)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function handleAssetDeleted(assetId: string) {
    if (!connection) return
    removeAssetFromAllCaches(connection.apiBaseUrl, assetId)
    evictThumbnail(assetId)
    setAssets((prev) => prev.filter((a) => a.id !== assetId))
    void load(undefined, true)
  }

  const filterLabel = FILES_FILTERS.find((f) => f.id === filter)?.label ?? "files"
  const libraryTotal = useMemo(() => assetCountForFilter(libraries, filter), [libraries, filter])
  const showFoldersSection = libraryScoped && !folderId
  const countMismatch = !loading && filter !== "all" && libraryTotal !== assets.length && !folderId
  const showSkeleton = loading && assets.length === 0 && visibleFolders.length === 0 && !hasCache

  const activeLibrary = libraryScoped
    ? findLibraryBySlug(libraries, librarySlugForFilter(filter))
    : null
  const activeLibraryId = activeLibrary?.id ?? null

  const breadcrumbLibrary = activeLibrary?.name ?? (libraryScoped ? filterLabel : null)

  const subtitle =
    loading && !hasCache
      ? "Loading…"
      : refreshing
        ? "Updating…"
        : currentFolder
          ? `${currentFolder.name} · ${assets.length} files`
          : filter === "all"
            ? `${assets.length} files across all libraries`
            : `${assets.length} in ${filterLabel}${libraryTotal !== assets.length ? ` · ${libraryTotal} in library` : ""}`

  const triggerUpload = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const triggerRefresh = useCallback(() => {
    void load(undefined, true)
  }, [load])

  const triggerCreateFolder = useCallback(() => {
    setCreateFolderOpen(true)
  }, [])

  useEffect(() => {
    setChrome({
      subtitle,
      filter,
      libraries,
      libraryScoped,
      breadcrumbLibrary,
      currentFolderName: currentFolder?.name ?? null,
      loading,
      hasCache,
      refreshing,
      uploading,
      canUpload: Boolean(connection),
      canCreateFolder: Boolean(connection && activeLibraryId),
      onRefresh: triggerRefresh,
      onUpload: triggerUpload,
      onCreateFolder: triggerCreateFolder,
      onChangeFilter: changeFilter,
      onGoToLibraryRoot: goToLibraryRoot,
    })
    return () => setChrome(null)
  }, [
    subtitle,
    filter,
    libraries,
    libraryScoped,
    breadcrumbLibrary,
    currentFolder,
    loading,
    hasCache,
    refreshing,
    uploading,
    connection,
    activeLibraryId,
    setChrome,
    triggerRefresh,
    triggerUpload,
    triggerCreateFolder,
    changeFilter,
    goToLibraryRoot,
  ])

  return (
    <div className="files-page-content flex flex-col gap-5">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,application/*"
        onChange={(e) => void handleFilesSelected(e.target.files)}
      />

      {viewerIndex !== null && connection ? (
        <AssetViewer
          assets={assets}
          initialIndex={viewerIndex}
          libraries={libraries}
          connection={connection}
          browseFolderId={folderId}
          onClose={() => setViewerIndex(null)}
          onChanged={() => void load(undefined, true)}
          onDeleted={handleAssetDeleted}
        />
      ) : null}

      <MobileCreateFolderSheet
        open={createFolderOpen}
        libraryId={activeLibraryId}
        libraryName={breadcrumbLibrary}
        parentFolderId={folderId}
        parentFolderName={currentFolder?.name ?? null}
        onClose={() => setCreateFolderOpen(false)}
        onCreated={() => void load(undefined, true)}
      />

      {/* ── all folders inline view — swaps out main content ─── */}
      {allFoldersOpen ? (
        <AllFoldersList
          folders={visibleFolders}
          refreshing={refreshing}
          onClose={() => setAllFoldersOpen(false)}
          onOpen={(id) => { setAllFoldersOpen(false); openFolder(id) }}
          onDelete={(id) => handleDeleteFolder(id)}
          onRename={(id, name) => handleRenameFolder(id, name)}
          onRefresh={() => void load(undefined, true)}
        />
      ) : (
        <>
          {uploadNotice ? (
            <p
              className="rounded-xl px-4 py-2.5 text-center text-[12px] font-medium text-[#15803d]"
              style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
            >
              {uploadNotice}
            </p>
          ) : null}

          {error ? (
            <div
              className="rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"
              style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {uploading && uploadName ? (
            <div
              className="rounded-2xl bg-white px-4 py-3"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <div className="flex items-center gap-2">
                <CloudUpload className="size-4 shrink-0 text-[#ff4f12]" />
                <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#222222]">
                  {uploadName}
                </p>
                <span className="text-[11px] font-semibold tabular-nums text-[#717171]">
                  {uploadProgress ?? 0}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f0f0f0]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${uploadProgress ?? 0}%`, backgroundColor: "#ff4f12" }}
                />
              </div>
            </div>
          ) : null}

          <div>
            {showSkeleton ? (
              <GridSkeleton />
            ) : (
              <div className={`flex flex-col gap-4 ${refreshing ? "opacity-80" : ""}`}>
                {showFoldersSection ? (
                  <section className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                        Folders
                      </p>
                      {visibleFolders.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setAllFoldersOpen(true)}
                          className="text-[12px] font-semibold active:opacity-70"
                          style={{ color: "#ff4f12" }}
                        >
                          View all ({visibleFolders.length})
                        </button>
                      )}
                    </div>
                    {visibleFolders.length > 0 ? (
                      <div
                        className="overflow-hidden rounded-2xl bg-white"
                        style={{ border: "1px solid #e5e5e5" }}
                      >
                        {visibleFolders.slice(0, 2).map((folder, i) => (
                          <div key={folder.id}>
                            {i > 0 ? <div className="mx-4 h-px bg-[#f5f5f5]" /> : null}
                            <FolderTile
                              folder={folder}
                              onOpen={() => openFolder(folder.id)}
                              onDelete={() => handleDeleteFolder(folder.id)}
                              onRename={(name) => handleRenameFolder(folder.id, name)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <SectionPlaceholder
                        icon={Folder}
                        title="No folders yet"
                        description="Tap the folder+ icon above to create one."
                      />
                    )}
                  </section>
                ) : null}

                <section className="flex flex-col gap-2">
                  {(showFoldersSection || assets.length > 0) && (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                      {showFoldersSection ? "Files" : "Assets"}
                    </p>
                  )}
                  {assets.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {assets.map((asset, i) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setViewerIndex(i)}
                          className="overflow-hidden rounded-2xl bg-white p-2 text-left shadow-sm active:opacity-90"
                          style={{ border: "1px solid #e5e5e5" }}
                        >
                          {connection ? (
                            <AssetThumbnail asset={asset} connection={connection} />
                          ) : null}
                          <p className="mt-2 truncate px-0.5 text-[14px] font-semibold leading-tight text-[#222222]">
                            {asset.title?.trim() || asset.originalFilename}
                          </p>
                          <p className="mt-1 truncate px-0.5 pb-0.5 text-[11px] leading-snug text-[#a0a0a0]">
                            {formatBytes(asset.sizeBytes)}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <SectionPlaceholder
                      icon={CloudUpload}
                      title={
                        currentFolder
                          ? "No files in this folder"
                          : filter === "all"
                            ? "No files yet"
                            : `No ${filterLabel.toLowerCase()} yet`
                      }
                      description={
                        currentFolder
                          ? "Upload files here or move items from another folder."
                          : "Tap upload above to add files to this library."
                      }
                    />
                  )}
                </section>

                {!showFoldersSection && assets.length === 0 && filter === "all" ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white active:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#ff4f12" }}
                  >
                    <CloudUpload className="size-4" />
                    Upload files
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ── all folders inline list — renders as normal page content ─── */

function AllFoldersList({
  folders,
  refreshing,
  onClose,
  onOpen,
  onDelete,
  onRename,
  onRefresh,
}: {
  folders: FolderSummary[]
  refreshing: boolean
  onClose: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onRefresh: () => void
}) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? folders.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
    : folders

  return (
    <div className="flex flex-col gap-4">
      {/* intro card */}
      <div
        className="relative overflow-hidden rounded-2xl px-4 pb-4 pt-4"
        style={{ background: "linear-gradient(155deg, #ff6a30 0%, #c82d00 100%)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 flex size-9 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
          aria-label="Back"
        >
          <ArrowLeft className="size-4 text-white" />
        </button>
        <div className="mt-10">
          <p className="text-[22px] font-bold text-white">Folders</p>
          <p className="mt-0.5 text-[13px]" style={{ color: "rgba(255,255,255,0.72)" }}>
            {folders.length} folder{folders.length !== 1 ? "s" : ""}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
            Organize your files and assets with folders. Tap any folder to browse its contents.
          </p>
        </div>
      </div>

      {/* search + refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a0a0a0]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search folders…"
            className="w-full rounded-2xl border border-[#e5e5e5] bg-white py-3 pl-10 pr-10 text-[14px] text-[#222222] outline-none placeholder:text-[#a0a0a0] focus:border-[#ff4f12]"
            autoComplete="off"
            aria-label="Search folders"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#717171] active:bg-[#f7f7f7]"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#717171]"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Refresh"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* folder list */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl bg-white px-4 py-10 text-center"
          style={{ border: "1px dashed #e5e5e5" }}
        >
          <Folder className="mx-auto mb-3 size-7 text-[#e5e5e5]" />
          <p className="text-[13px] font-medium text-[#222222]">
            {query ? "No folders matched" : "No folders yet"}
          </p>
        </div>
      ) : (
        <div
          className={`overflow-hidden rounded-2xl bg-white ${refreshing ? "opacity-70" : ""}`}
          style={{ border: "1px solid #e5e5e5" }}
        >
          {filtered.map((folder, i) => (
            <div key={folder.id}>
              {i > 0 ? <div className="mx-4 h-px bg-[#f5f5f5]" /> : null}
              <FolderTile
                folder={folder}
                onOpen={() => onOpen(folder.id)}
                onDelete={() => onDelete(folder.id)}
                onRename={(name) => onRename(folder.id, name)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
