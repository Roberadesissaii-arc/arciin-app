"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, CloudUpload, Folder, RefreshCw, Search, X } from "lucide-react"

import { useFilesChrome } from "@/components/files/files-chrome-context"
import { FolderTile } from "@/components/files/folder-tile"
import { AssetViewer } from "@/components/files/asset-viewer"
import { DeleteAssetDialog } from "@/components/files/delete-asset-dialog"
import { MobileAssetBulkBar } from "@/components/files/mobile-asset-bulk-bar"
import { MobileAssetGrid } from "@/components/files/mobile-asset-grid"
import { MobileCreateFolderSheet } from "@/components/files/mobile-create-folder-sheet"
import { MobileDuplicateUploadSheet } from "@/components/files/mobile-duplicate-upload-sheet"
import { MobileImportLinkSheet } from "@/components/files/mobile-import-link-sheet"
import { MobileMoveFolderSheet } from "@/components/files/mobile-move-folder-sheet"
import { MobileUploadProgressBar } from "@/components/files/mobile-upload-progress-bar"
import { ShareOptionsSheet } from "@/components/files/share-options-sheet"
import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import { MobilePageIntro } from "@/components/shell/mobile-page-intro"
import { useConnection } from "@/components/providers/connection-provider"
import {
  getAssets,
  beginDownloadAssets,
  deleteAsset,
  moveAsset,
} from "@/lib/api/assets"
import { prefetchAssetBlob } from "@/lib/api/asset-blob-cache"
import { formatApiError } from "@/lib/api/errors"
import { suppressFetchErrorWhenOffline } from "@/lib/connection/offline-ui"
import {
  deleteFolder,
  listFolders,
  lockFolder,
  removeFolderLock,
  renameFolder,
  unlockFolder,
  type FolderCredentialInput,
} from "@/lib/api/folders"
import { getPasswordVault } from "@/lib/api/password-vault"
import { MobileFolderCredentialSheet } from "@/components/files/mobile-folder-credential-sheet"
import { listLibraries } from "@/lib/api/libraries"
import { getUploadSettings } from "@/lib/api/settings"
import { getUploadSessions, IMPORT_IN_PROGRESS_STATUSES } from "@/lib/api/imports"
import type { UploadSessionSummary } from "@/lib/types/assets"
import {
  formatUploadUserMessage,
  type UploadUserMessage,
} from "@/lib/api/upload-errors"
import { UploadIssueBanner } from "@/components/files/upload-issue-banner"
import {
  uploadFilesBatch,
  type BatchUploadItemResult,
  type BatchUploadProgress,
} from "@/lib/uploads/upload-batch"
import {
  beginMobileUploadBatch,
  finishMobileUploadBatch,
  isMobileUploadBatchPending,
  resetMobileUploadBatch,
  subscribeMobileUploadStatus,
  type MobileUploadStatusNotice,
} from "@/lib/uploads/mobile-upload-batch"
import {
  resolveUploadDuplicates,
  validateUploadSelection,
} from "@/lib/uploads/prepare-mobile-upload"
import { resolveFilesFromInput, waitForIosExport } from "@/lib/uploads/ios-file-picker"
import { applyDuplicateResolutions } from "@/lib/uploads/upload-duplicate-flow"
import type { DuplicateUploadConflict } from "@/lib/uploads/upload-duplicate-types"
import type { UploadSettings } from "@/lib/types/models"
import { useActiveUserPreferences } from "@/lib/hooks/use-active-user-preferences"
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
  assetCountsByFilter,
  findLibraryBySlug,
  formatAssetCount,
  libraryIdForFilter,
  librarySlugForFilter,
  type FilesFilterId,
} from "@/lib/files/library-helpers"
import type { AssetSummary, LibrarySummary } from "@/lib/types/assets"
import type { FolderSummary } from "@/lib/types/folders"
import { FILES_FILTERS } from "@/lib/files/filter-config"

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
      <div className="empty-state-icon flex size-14 items-center justify-center rounded-2xl">
        <Icon className="text-accent size-7" strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-center text-[14px] font-semibold text-[#222222]">{title}</p>
      <p className="mt-1 max-w-[220px] text-center text-[12px] leading-relaxed text-[#a0a0a0]">
        {description}
      </p>
    </div>
  )
}

/** Error banner copy for share/save actions (kept distinct from upload copy). */
function assetActionIssue(err: unknown, verb: "share" | "save"): UploadUserMessage {
  const detail =
    err instanceof Error && err.message.trim()
      ? err.message.trim()
      : verb === "share"
        ? "Could not share these files on this device. Try again."
        : "Could not save these files on this device. Try again."
  return {
    title: verb === "share" ? "Couldn’t share" : "Couldn’t save",
    detail,
    retryable: false,
  }
}

export function FilesPage() {
  const { connection, ready, serverReachable } = useConnection()
  const serverOnline = serverReachable !== false
  const { setChrome } = useFilesChrome()
  const inputRef = useRef<HTMLInputElement>(null)
  const issueBannerRef = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<FilesFilterId>("all")
  const [folderId, setFolderId] = useState<string | null>(null)
  const [libraries, setLibraries] = useState<LibrarySummary[]>([])
  const [folders, setFolders] = useState<FolderSummary[]>([])
  const [assets, setAssets] = useState<AssetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preparingUpload, setPreparingUpload] = useState(false)
  const [preparingCount, setPreparingCount] = useState(0)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadName, setUploadName] = useState<string | null>(null)
  const [uploadDone, setUploadDone] = useState<MobileUploadStatusNotice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadIssue, setUploadIssue] = useState<UploadUserMessage | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [importLinkOpen, setImportLinkOpen] = useState(false)
  /** Inline link-import progress (same bar as gallery uploads) — no toast. */
  const [importProgress, setImportProgress] = useState<{ source: string; percent: number } | null>(
    null,
  )
  const [allFoldersOpen, setAllFoldersOpen] = useState(false)
  const [hasCache, setHasCache] = useState(false)
  const userPrefs = useActiveUserPreferences()
  const documentThumbnailsEnabled = userPrefs.media.documentThumbnails
  const [folderCredential, setFolderCredential] = useState<{
    folderId: string
    mode: "open" | "lock" | "remove-lock"
  } | null>(null)
  const [pinConfigured, setPinConfigured] = useState(false)
  const [uploadLimits, setUploadLimits] = useState<UploadSettings | null>(null)
  const [duplicateConflicts, setDuplicateConflicts] = useState<DuplicateUploadConflict[] | null>(
    null,
  )
  const [queuedCleanFiles, setQueuedCleanFiles] = useState<File[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(() => new Set())
  const [moveAssets, setMoveAssets] = useState<AssetSummary[]>([])
  const [deleteTargets, setDeleteTargets] = useState<AssetSummary[]>([])
  const [shareAssets, setShareAssets] = useState<AssetSummary[]>([])
  const [assetActionBusy, setAssetActionBusy] = useState(false)
  const [assetActionMessage, setAssetActionMessage] = useState<string | null>(null)

  const libraryScoped = filter !== "all"

  useEffect(() => {
    if (!connection || !serverOnline) return
    let cancelled = false
    void getUploadSettings(connection)
      .then((limits) => {
        if (!cancelled) setUploadLimits(limits)
      })
      .catch(() => {
        /* use default pre-check */
      })
    return () => {
      cancelled = true
    }
  }, [connection, serverOnline])

  useEffect(() => {
    if (!connection) return
    let cancelled = false
    void getPasswordVault(connection)
      .then((vault) => {
        if (!cancelled) setPinConfigured(vault.pinConfigured)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [connection])

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

      const cacheKey = filesCacheKey(connection.apiBaseUrl, activeFilter, activeFolderId)
      const cached = readFilesCache(cacheKey)

      if (!isRefresh && cached) {
        applyCache(cached)
        if (!isFilesCacheStale(cached)) {
          try {
            const libs = await listLibraries(connection, signal)
            if (!signal?.aborted) setLibraries(libs)
          } catch {
            /* keep cached library list */
          }
          return
        }
        setRefreshing(true)
      } else if (isRefresh) {
        setRefreshing(true)
      } else if (!cached) {
        setLoading(true)
        setHasCache(false)
      }

      setError(null)

      try {
        const libs = await listLibraries(connection, signal)
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
        if (!signal?.aborted && !cached) {
          setError(suppressFetchErrorWhenOffline(serverReachable, formatApiError(err)))
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [applyCache, connection, filter, folderId, serverReachable],
  )

  useEffect(() => {
    if (!ready || !connection) return
    if (!serverOnline) {
      setError(null)
      return
    }
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection, serverOnline, load])

  useEffect(() => {
    if (serverReachable === false) setError(null)
  }, [serverReachable])

  const clearAssetSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedAssetIds(new Set())
  }, [])

  useEffect(() => {
    clearAssetSelection()
    setMoveAssets([])
    setDeleteTargets([])
  }, [filter, folderId, clearAssetSelection])

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetIds.has(asset.id)),
    [assets, selectedAssetIds],
  )

  // Bring the error/issue banner into view — actions can fail while the user is
  // scrolled to the bottom of the grid, and the banner renders up top.
  useEffect(() => {
    if (!uploadIssue) return
    issueBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [uploadIssue])

  // Warm the blob cache for selected assets so bulk Share/Save can call
  // navigator.share synchronously inside the tap (required by iOS Safari).
  useEffect(() => {
    if (!selectionMode || !connection) return
    for (const asset of selectedAssets) {
      prefetchAssetBlob(connection, asset.id, asset.sizeBytes)
    }
  }, [selectionMode, selectedAssets, connection])

  const bulkMoveLibraryId = useMemo(() => {
    const ids = new Set(selectedAssets.map((asset) => asset.libraryId))
    return ids.size === 1 ? selectedAssets[0]?.libraryId ?? null : null
  }, [selectedAssets])

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
      const target = folders.find((f) => f.id === id)
      if (target?.isLocked && !target.accessGranted) {
        setFolderCredential({ folderId: id, mode: "open" })
        return
      }
      setFolderId(id)
      void load(undefined, false, { folderId: id })
    },
    [folders, load],
  )

  const applyFolderCredential = useCallback(
    async (input: FolderCredentialInput) => {
      if (!connection || !folderCredential) return
      const { folderId, mode } = folderCredential
      if (mode === "lock") {
        const updated = await lockFolder(connection, folderId, input)
        setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, ...updated } : f)))
        return
      }
      if (mode === "remove-lock") {
        const updated = await removeFolderLock(connection, folderId, input)
        setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, ...updated } : f)))
        return
      }
      const updated = await unlockFolder(connection, folderId, input)
      setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, ...updated } : f)))
      setFolderId(folderId)
      void load(undefined, false, { folderId })
    },
    [connection, folderCredential, load],
  )

  const folderCredentialCopy =
    folderCredential?.mode === "lock"
      ? {
          title: "Lock folder",
          description: "Enter your password or vault PIN. The lock syncs to all devices.",
          submit: "Lock folder",
        }
      : folderCredential?.mode === "remove-lock"
        ? {
            title: "Remove lock",
            description: "Enter your credentials to unlock this folder for everyone.",
            submit: "Remove lock",
          }
        : {
            title: "Unlock folder",
            description: "Enter your credentials to open this folder for 15 minutes.",
            submit: "Unlock",
          }

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

  const executeUpload = useCallback(
    async (files: File[]) => {
      if (!connection || files.length === 0) return

      setUploading(true)
      setPreparingUpload(false)
      setPreparingCount(0)
      setUploadProgress(0)
      setUploadName(
        files.length === 1
          ? files[0]?.name ?? "Uploading"
          : `0/${files.length} files`,
      )
      setError(null)
      setUploadIssue(null)
      setUploadDone(null)

      beginMobileUploadBatch(files.length)

      const forceInbox =
        filter === "inbox" ? libraryIdForFilter(libraries, "inbox") : undefined

      let lastDestination = ""
      let reloadFilter: FilesFilterId = filter
      const reloadFolderId = folderId

      // Upload in sequential chunks so the mobile webview never holds the whole
      // batch in memory at once (large selections used to crash the tab).
      const CHUNK_SIZE = 25
      const total = files.length

      try {
        const results: BatchUploadItemResult[] = []
        let completedBefore = 0

        for (let start = 0; start < total; start += CHUNK_SIZE) {
          const chunk = files.slice(start, start + CHUNK_SIZE)

          const chunkResults = await uploadFilesBatch({
            connection,
            files: chunk,
            maxUploadSizeMb: uploadLimits?.maxUploadSizeMb ?? 20 * 1024,
            ...(forceInbox ? { targetLibraryId: forceInbox } : {}),
            ...(folderId ? { targetFolderId: folderId } : {}),
            onProgress: (progress: BatchUploadProgress) => {
              const globalCompleted = completedBefore + progress.completed
              const overall =
                globalCompleted >= total
                  ? 100
                  : Math.min(
                      99,
                      Math.floor(
                        ((completedBefore + (progress.overallPercent / 100) * chunk.length) /
                          total) *
                          100,
                      ),
                    )
              setUploadName(total === 1 ? progress.label : `${globalCompleted}/${total} files`)
              setUploadProgress(overall)
            },
          })

          results.push(...chunkResults)
          completedBefore += chunk.length

          // Yield between chunks so iOS can release memory from the finished batch.
          if (start + CHUNK_SIZE < total) {
            await new Promise((resolve) => window.setTimeout(resolve, 40))
          }
        }

        setUploadProgress(100)
        setUploadName(
          total === 1 ? files[0]?.name ?? "Uploading" : `${total}/${total} files`,
        )

        const succeeded = results.filter((item) => item.ok)
        const failed = results.filter((item) => !item.ok)

        if (failed.length > 0 && succeeded.length === 0) {
          finishMobileUploadBatch(results)
          throw failed[0]!.error ?? new Error("Upload failed.")
        }

        for (const item of succeeded) {
          const result = item.result!
          const detected = result.detectedMediaType ?? classifyFile(item.file)
          const destName = result.targetLibrary?.name
          lastDestination = destName
            ? `${destName} (${detected.toLowerCase()})`
            : detected.toLowerCase()

          if (succeeded.length <= 24 && result.detectedMediaType) {
            const nextFilter = filterIdForMediaType(result.detectedMediaType)
            reloadFilter = filter === "all" ? "all" : nextFilter
            if (reloadFilter !== filter) setFilter(reloadFilter)
          }
        }

        finishMobileUploadBatch(results, {
          singleFileDetail: succeeded.length === 1 ? lastDestination : undefined,
        })

        if (failed.length > 0) {
          setUploadIssue(formatUploadUserMessage(failed[0]!.error))
        }

        await load(undefined, true, { filter: reloadFilter, folderId: reloadFolderId })
      } catch (err) {
        if (isMobileUploadBatchPending()) {
          if (serverReachable === false) {
            resetMobileUploadBatch()
          } else {
            finishMobileUploadBatch(files.map(() => ({ ok: false })))
          }
        }
        if (serverReachable === false) {
          setUploadIssue(null)
          setError(null)
        } else {
          setUploadIssue(formatUploadUserMessage(err))
          setError(null)
        }
      } finally {
        setUploading(false)
        setUploadProgress(null)
        setUploadName(null)
        if (inputRef.current) inputRef.current.value = ""
      }
    },
    [connection, filter, folderId, libraries, load, serverReachable, uploadLimits?.maxUploadSizeMb],
  )

  const processSelectedFiles = useCallback(
    async (files: File[]) => {
      if (!connection || files.length === 0) return

      setPreparingUpload(true)
      setPreparingCount(files.length)
      setUploadIssue(null)
      setError(null)

      const maxMb = uploadLimits?.maxUploadSizeMb ?? 20 * 1024

      try {
        const validation = await validateUploadSelection(files, maxMb)
        if (!validation.ok) {
          setUploadIssue(validation.issue)
          setError(null)
          return
        }

        const { clean, conflicts } = await resolveUploadDuplicates(
          connection,
          files,
          filter,
          libraries,
          folderId,
          hasCache,
          assets,
        )

        if (conflicts.length > 0) {
          setQueuedCleanFiles(clean)
          setDuplicateConflicts(conflicts)
          if (inputRef.current) inputRef.current.value = ""
          return
        }

        await executeUpload(files)
      } catch (err) {
        setUploadIssue(formatUploadUserMessage(err))
        setError(null)
      } finally {
        setPreparingUpload(false)
        setPreparingCount(0)
      }
    },
    [
      assets,
      connection,
      executeUpload,
      filter,
      folderId,
      hasCache,
      libraries,
      uploadLimits?.maxUploadSizeMb,
    ],
  )

  async function handleDuplicateResolve(resolved: DuplicateUploadConflict[]) {
    if (!connection) return
    setDuplicateConflicts(null)
    try {
      const fromConflicts = await applyDuplicateResolutions(connection, resolved)
      const all = [...queuedCleanFiles, ...fromConflicts]
      setQueuedCleanFiles([])
      await executeUpload(all)
    } catch (err) {
      setQueuedCleanFiles([])
      setUploadIssue(formatUploadUserMessage(err))
    }
  }

  function handleDuplicateCancel() {
    // Dismissing the duplicate prompt (button OR backdrop tap) must still upload
    // the NEW, non-duplicate files — only the duplicates are skipped. Previously
    // this discarded EVERYTHING, so a single name collision silently dropped a
    // whole batch of good photos. That was the "sometimes it doesn't work" bug.
    const clean = queuedCleanFiles
    setDuplicateConflicts(null)
    setQueuedCleanFiles([])
    if (inputRef.current) inputRef.current.value = ""
    if (clean.length > 0) void executeUpload(clean)
  }

  function handleAssetDeleted(assetId: string) {
    if (!connection) return
    removeAssetFromAllCaches(connection.apiBaseUrl, assetId)
    evictThumbnail(assetId)
    setAssets((prev) => prev.filter((a) => a.id !== assetId))
    setSelectedAssetIds((prev) => {
      if (!prev.has(assetId)) return prev
      const next = new Set(prev)
      next.delete(assetId)
      return next
    })
    void load(undefined, true)
  }

  async function handleDeleteAssets(targets: AssetSummary[]) {
    if (!connection || targets.length === 0) return
    setAssetActionBusy(true)
    try {
      const ids = new Set(targets.map((asset) => asset.id))
      for (const asset of targets) {
        await deleteAsset(connection, asset.id)
        removeAssetFromAllCaches(connection.apiBaseUrl, asset.id)
        evictThumbnail(asset.id)
      }
      setAssets((prev) => prev.filter((asset) => !ids.has(asset.id)))
      setDeleteTargets([])
      clearAssetSelection()
      void load(undefined, true)
    } catch (err) {
      setUploadIssue(formatUploadUserMessage(err))
    } finally {
      setAssetActionBusy(false)
    }
  }

  async function handleMoveAssets(targets: AssetSummary[], targetFolderId: string | null) {
    if (!connection || targets.length === 0) return
    setAssetActionBusy(true)
    try {
      for (const asset of targets) {
        await moveAsset(connection, asset.id, {
          libraryId: asset.libraryId,
          folderId: targetFolderId,
        })
      }
      setMoveAssets([])
      clearAssetSelection()
      setAssetActionMessage(
        targets.length === 1 ? "File moved" : `${targets.length} files moved`,
      )
      setTimeout(() => setAssetActionMessage(null), 2500)
      void load(undefined, true)
    } catch (err) {
      setUploadIssue(formatUploadUserMessage(err))
    } finally {
      setAssetActionBusy(false)
    }
  }

  function handleShareAssets(targets: AssetSummary[]) {
    if (targets.length === 0) return
    setShareAssets(targets)
  }

  function handleDownloadAssets(targets: AssetSummary[]) {
    if (!connection || targets.length === 0) return
    setAssetActionBusy(true)
    void beginDownloadAssets(connection, targets)
      .then((result) => {
        if (result !== "cancelled") {
          setAssetActionMessage(result === "opened_tab" ? "Opened in new tab" : "Saved")
          setTimeout(() => setAssetActionMessage(null), 2500)
        }
      })
      .catch((err) => {
        setUploadIssue(assetActionIssue(err, "save"))
      })
      .finally(() => {
        setAssetActionBusy(false)
      })
  }

  useEffect(() => {
    let timer: number | null = null
    const unsub = subscribeMobileUploadStatus((notice) => {
      setUploadDone(notice)
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        setUploadDone(null)
        timer = null
      }, 4000)
    })
    return () => {
      unsub()
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [])

  const filterLabel = FILES_FILTERS.find((f) => f.id === filter)?.label ?? "Assets"
  const atLibraryRoot = libraryScoped && !folderId
  const filterAssetCounts = useMemo(
    () =>
      assetCountsByFilter(libraries, {
        activeFilter: filter,
        folders,
        rootAssets: assets,
        atLibraryRoot,
      }),
    [libraries, filter, folders, assets, atLibraryRoot],
  )
  const showFoldersSection = atLibraryRoot
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
          ? `${currentFolder.name} · ${formatAssetCount(assets.length)}`
          : filter === "all"
            ? `${formatAssetCount(filterAssetCounts.all)} across all libraries`
            : `${formatAssetCount(filterAssetCounts[filter])} in ${filterLabel}`

  const triggerUpload = useCallback(() => {
    const input = inputRef.current
    if (!input) return
    setUploadIssue(null)
    input.value = ""
    input.click()
  }, [])

  const triggerRefresh = useCallback(() => {
    void load(undefined, true)
  }, [load])

  const triggerCreateFolder = useCallback(() => {
    setCreateFolderOpen(true)
  }, [])

  const triggerImportLink = useCallback(() => {
    setImportLinkOpen(true)
  }, [])

  /**
   * Track a link import to completion with the same inline progress bar a
   * gallery upload uses (no toast). We suppress the realtime upload toast via
   * beginMobileUploadBatch, poll the upload session for real progress, then
   * hand off to finishMobileUploadBatch so the shared "complete" bar shows.
   */
  const startImportTracking = useCallback(
    (session: UploadSessionSummary, sourceLabel: string) => {
      if (!connection) return
      const conn = connection
      beginMobileUploadBatch(1)
      setImportProgress({ source: sourceLabel, percent: Math.max(session.progress ?? 0, 5) })

      const startedAt = Date.now()
      const SAFETY_TIMEOUT_MS = 300_000
      let cancelled = false

      const finish = (ok: boolean) => {
        if (cancelled) return
        cancelled = true
        setImportProgress(null)
        finishMobileUploadBatch([{ ok }], {
          singleFileDetail: ok ? `Imported from ${sourceLabel}` : undefined,
        })
        void load(undefined, true)
      }

      const poll = async () => {
        if (cancelled) return
        if (Date.now() - startedAt > SAFETY_TIMEOUT_MS) {
          cancelled = true
          setImportProgress(null)
          resetMobileUploadBatch()
          void load(undefined, true)
          return
        }
        try {
          const sessions = await getUploadSessions(conn)
          const found = sessions.find((s) => s.id === session.id)
          if (found) {
            // Import sessions for media (video/image/audio) finish at status
            // CLASSIFIED with progress 100 — the worker never flips them to
            // READY (it pre-sets completedAt, which the thumbnail job's READY
            // update skips). So "done" = the asset exists and progress hit 100,
            // OR a truly terminal status. Otherwise we'd stick at 100 forever.
            const done =
              found.status === "READY" ||
              found.status === "FAILED" ||
              (found.progress >= 100 && Boolean(found.assetId)) ||
              !IMPORT_IN_PROGRESS_STATUSES.has(found.status)
            if (done) {
              finish(found.status !== "FAILED")
              return
            }
            setImportProgress((prev) =>
              prev
                ? { ...prev, percent: Math.max(prev.percent, found.progress ?? prev.percent) }
                : prev,
            )
          }
        } catch {
          /* transient network — keep polling */
        }
        if (!cancelled) window.setTimeout(() => void poll(), 1800)
      }

      window.setTimeout(() => void poll(), 1500)
    },
    [connection, load],
  )

  const closeAllFolders = useCallback(() => {
    setAllFoldersOpen(false)
  }, [])

  useEffect(() => {
    setChrome({
      view: allFoldersOpen ? "all-folders" : "files",
      subtitle: allFoldersOpen
        ? `${visibleFolders.length} folder${visibleFolders.length !== 1 ? "s" : ""}`
        : subtitle,
      filter,
      libraries,
      filterAssetCounts,
      libraryScoped,
      breadcrumbLibrary,
      currentFolderName: currentFolder?.name ?? null,
      loading,
      hasCache,
      refreshing,
      uploading: uploading || preparingUpload,
      canUpload: Boolean(connection) && serverOnline && !allFoldersOpen,
      canCreateFolder: Boolean(connection && activeLibraryId) && !allFoldersOpen,
      canImportLink: Boolean(connection) && serverOnline && !allFoldersOpen,
      onRefresh: triggerRefresh,
      onUpload: triggerUpload,
      onCreateFolder: triggerCreateFolder,
      onImportLink: triggerImportLink,
      onChangeFilter: changeFilter,
      onGoToLibraryRoot: goToLibraryRoot,
      onCloseAllFolders: closeAllFolders,
    })
    return () => setChrome(null)
  }, [
    allFoldersOpen,
    subtitle,
    filter,
    libraries,
    filterAssetCounts,
    libraryScoped,
    breadcrumbLibrary,
    currentFolder,
    loading,
    hasCache,
    refreshing,
    uploading,
    preparingUpload,
    connection,
    serverOnline,
    activeLibraryId,
    visibleFolders.length,
    setChrome,
    triggerRefresh,
    triggerUpload,
    triggerCreateFolder,
    triggerImportLink,
    changeFilter,
    goToLibraryRoot,
    closeAllFolders,
  ])

  return (
    <div
      className={`files-page-content flex flex-col gap-5${
        selectionMode && selectedAssetIds.size > 0 ? " pb-28" : ""
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="mobile-file-picker-input"
        multiple
        onChange={(e) => {
          // iOS Safari fires `change` BEFORE all selected photos are attached
          // (the count grows over a few seconds) — reading files immediately
          // and clearing value drops most of a multi-photo selection. Wait for
          // the count to settle, THEN snapshot and clear.
          const input = e.currentTarget
          setPreparingUpload(true)
          setPreparingCount(0)
          void resolveFilesFromInput(input, {
            onCount: (n) => setPreparingCount(n),
          }).then(async (files) => {
            input.value = ""
            if (files.length === 0) {
              setPreparingUpload(false)
              setPreparingCount(0)
              return
            }
            // iOS keeps exporting HEIC/MOV blobs briefly after the count settles.
            await waitForIosExport(files.length)
            void processSelectedFiles(files)
          })
        }}
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
        existingFolderNames={visibleFolders.map((folder) => folder.name)}
        onClose={() => setCreateFolderOpen(false)}
        onCreated={() => void load(undefined, true)}
      />

      <MobileImportLinkSheet
        open={importLinkOpen}
        libraryId={activeLibraryId}
        folderId={folderId}
        onClose={() => setImportLinkOpen(false)}
        onImportStarted={startImportTracking}
      />

      {duplicateConflicts && duplicateConflicts.length > 0 ? (
        <MobileDuplicateUploadSheet
          conflicts={duplicateConflicts}
          onResolve={(resolved) => void handleDuplicateResolve(resolved)}
          onCancel={handleDuplicateCancel}
        />
      ) : null}

      {folderCredential ? (
        <MobileFolderCredentialSheet
          pinConfigured={pinConfigured}
          title={folderCredentialCopy.title}
          description={folderCredentialCopy.description}
          submitLabel={folderCredentialCopy.submit}
          onClose={() => setFolderCredential(null)}
          onSubmit={applyFolderCredential}
        />
      ) : null}

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
          onRequestUnlock={(id) => setFolderCredential({ folderId: id, mode: "open" })}
          onLockFolder={(id) => setFolderCredential({ folderId: id, mode: "lock" })}
          onRemoveLock={(id) => setFolderCredential({ folderId: id, mode: "remove-lock" })}
        />
      ) : (
        <>
          <PageFetchErrorAlert error={error} onRetry={() => void load()} />

          {uploadIssue ? (
            <div ref={issueBannerRef} className="scroll-mt-24">
              <UploadIssueBanner
                issue={uploadIssue}
                onDismiss={() => setUploadIssue(null)}
                onRetry={() => inputRef.current?.click()}
              />
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
                      {visibleFolders.length > 6 && (
                        <button
                          type="button"
                          onClick={() => setAllFoldersOpen(true)}
                          className="text-accent text-[12px] font-semibold active:opacity-70"
                        >
                          View all ({visibleFolders.length})
                        </button>
                      )}
                    </div>
                    {visibleFolders.length > 0 ? (
                      <div
                        className="overflow-hidden rounded-2xl bg-white"
                        data-folder-grid
                        style={{ border: "1px solid #e5e5e5" }}
                      >
                        {visibleFolders.slice(0, 6).map((folder, i) => (
                          <div key={folder.id}>
                            {i > 0 ? <div className="mx-4 h-px bg-[#f5f5f5]" /> : null}
                            <FolderTile
                              folder={folder}
                              onOpen={() => openFolder(folder.id)}
                              onDelete={() => handleDeleteFolder(folder.id)}
                              onRename={(name) => handleRenameFolder(folder.id, name)}
                              onRequestUnlock={() =>
                                setFolderCredential({ folderId: folder.id, mode: "open" })
                              }
                              onLockFolder={() =>
                                setFolderCredential({ folderId: folder.id, mode: "lock" })
                              }
                              onRemoveLock={() =>
                                setFolderCredential({ folderId: folder.id, mode: "remove-lock" })
                              }
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
                      Assets
                    </p>
                  )}
                  {preparingUpload ? (
                    <MobileUploadProgressBar mode="preparing" count={preparingCount} />
                  ) : null}
                  {uploading ? (
                    <MobileUploadProgressBar
                      mode="uploading"
                      label={uploadName}
                      percent={uploadProgress}
                    />
                  ) : null}
                  {importProgress ? (
                    <MobileUploadProgressBar
                      mode="uploading"
                      label={`Importing from ${importProgress.source}…`}
                      percent={importProgress.percent}
                    />
                  ) : null}
                  {!uploading && !preparingUpload && !importProgress && uploadDone ? (
                    <MobileUploadProgressBar
                      mode="complete"
                      title={uploadDone.title}
                      detail={uploadDone.detail}
                    />
                  ) : null}
                  {assets.length > 0 ? (
                    connection ? (
                      <MobileAssetGrid
                        assets={assets}
                        connection={connection}
                        documentThumbnailsEnabled={documentThumbnailsEnabled}
                        selectionMode={selectionMode}
                        selectedIds={selectedAssetIds}
                        onSelectionModeChange={setSelectionMode}
                        onSelectedIdsChange={setSelectedAssetIds}
                        onOpen={(index) => {
                          if (selectionMode) return
                          setViewerIndex(index)
                        }}
                      />
                    ) : null
                  ) : (
                    <SectionPlaceholder
                      icon={CloudUpload}
                      title={
                        currentFolder
                          ? "No assets in this folder"
                          : filter === "all"
                            ? "No assets yet"
                            : `No ${filterLabel.toLowerCase()} yet`
                      }
                      description={
                        currentFolder
                          ? "Upload assets here or move items from another folder."
                          : "Tap upload above to add assets to this library."
                      }
                    />
                  )}
                </section>

                {!showFoldersSection && assets.length === 0 && filter === "all" ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                    className="btn-accent-solid flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold active:opacity-90 disabled:opacity-50"
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

      {selectionMode && selectedAssetIds.size > 0 ? (
        <MobileAssetBulkBar
          count={selectedAssetIds.size}
          busy={assetActionBusy}
          canMove={Boolean(bulkMoveLibraryId)}
          onCancel={clearAssetSelection}
          onShare={() => handleShareAssets(selectedAssets)}
          onDownload={() => handleDownloadAssets(selectedAssets)}
          onMove={() => setMoveAssets(selectedAssets)}
          onDelete={() => setDeleteTargets(selectedAssets)}
        />
      ) : null}

      {moveAssets.length > 0 && moveAssets[0] ? (
        <MobileMoveFolderSheet
          open
          libraryId={moveAssets[0].libraryId}
          libraryName={
            libraries.find((library) => library.id === moveAssets[0]!.libraryId)?.name ?? "Library"
          }
          currentFolderId={folderId}
          assetFolderId={moveAssets.length === 1 ? moveAssets[0]!.folderId : undefined}
          busy={assetActionBusy}
          onClose={() => {
            if (assetActionBusy) return
            setMoveAssets([])
          }}
          onSelect={(targetFolderId) => void handleMoveAssets(moveAssets, targetFolderId)}
        />
      ) : null}

      <DeleteAssetDialog
        open={deleteTargets.length > 0}
        fileName={deleteTargets[0]?.originalFilename ?? "file"}
        count={deleteTargets.length}
        busy={assetActionBusy}
        onCancel={() => {
          if (assetActionBusy) return
          setDeleteTargets([])
        }}
        onConfirm={() => void handleDeleteAssets(deleteTargets)}
      />

      {connection && shareAssets.length > 0 ? (
        <ShareOptionsSheet
          open
          onClose={() => setShareAssets([])}
          connection={connection}
          assets={shareAssets}
        />
      ) : null}

      {assetActionMessage ? (
        <p className="fixed inset-x-0 bottom-[calc(var(--mobile-bottom-nav-height,4.5rem)+5.5rem)] z-[130] px-4 text-center text-[12px] font-medium text-[#16a34a]">
          {assetActionMessage}
        </p>
      ) : null}
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
  onRequestUnlock,
  onLockFolder,
  onRemoveLock,
}: {
  folders: FolderSummary[]
  refreshing: boolean
  onClose: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onRefresh: () => void
  onRequestUnlock: (id: string) => void
  onLockFolder: (id: string) => void
  onRemoveLock: (id: string) => void
}) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? folders.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
    : folders

  return (
    <div className="flex flex-col gap-4">
      <MobilePageIntro
        title="Folders"
        subtitle="Organize your files and assets with folders. Tap any folder to browse its contents."
        status={`${folders.length} folder${folders.length !== 1 ? "s" : ""}`}
        cornerIcon={Folder}
        statusIcon={Folder}
        action={
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white text-[#717171] active:bg-[#f7f7f7]"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
        }
      />

      {/* search + refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a0a0a0]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search folders…"
            className="w-full rounded-2xl border border-[#e5e5e5] bg-white py-3 pl-10 pr-10 text-[14px] text-[#222222] outline-none placeholder:text-[#a0a0a0] focus:border-[var(--arciin-accent,#ff4f12)]"
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
                onRequestUnlock={() => onRequestUnlock(folder.id)}
                onLockFolder={() => onLockFolder(folder.id)}
                onRemoveLock={() => onRemoveLock(folder.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
