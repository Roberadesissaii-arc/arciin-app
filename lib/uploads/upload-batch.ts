import type { MobileConnection } from "@/lib/types/api"
import type { UploadSessionSummary } from "@/lib/types/assets"
import { uploadFile } from "@/lib/api/uploads"
import { fileExceedsUploadLimit } from "@/lib/api/upload-errors"
import { uploadConcurrencyForBatch } from "@/lib/uploads/upload-concurrency"

export type BatchUploadItemResult = {
  file: File
  ok: boolean
  result?: UploadSessionSummary
  error?: unknown
}

export type BatchUploadProgress = {
  total: number
  completed: number
  activeCount: number
  overallPercent: number
  label: string
}

type BatchUploadOptions = {
  connection: MobileConnection
  files: File[]
  concurrency?: number
  targetLibraryId?: string
  targetFolderId?: string
  onProgress?: (progress: BatchUploadProgress) => void
  signal?: AbortSignal
  /** Minimum ms between progress callbacks (default 150). */
  progressThrottleMs?: number
  maxUploadSizeMb?: number
}

function weightForFile(file: File): number {
  return file.size > 0 ? file.size : 1
}

export async function uploadFilesBatch(options: BatchUploadOptions): Promise<BatchUploadItemResult[]> {
  const {
    connection,
    files,
    targetLibraryId,
    targetFolderId,
    onProgress,
    signal,
    progressThrottleMs = 150,
    maxUploadSizeMb,
  } = options

  if (files.length === 0) return []

  const concurrency = options.concurrency ?? uploadConcurrencyForBatch(files.length)
  const weights = files.map(weightForFile)
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  const progressByIndex = new Array<number>(files.length).fill(0)
  let nextIndex = 0
  let completed = 0
  let activeCount = 0
  let lastEmitAt = 0
  let emitTimer: number | null = null

  const results: BatchUploadItemResult[] = new Array(files.length)

  const buildProgress = (): BatchUploadProgress => {
    const activeIndex = progressByIndex.findIndex((value) => value > 0 && value < 100)
    const activeFile =
      activeIndex >= 0 ? files[activeIndex] : files[Math.min(completed, files.length - 1)]

    // Bytes can reach 100% before the server finishes — cap in-flight files at 95%
    // so bulk uploads never show 100% until every file is in `results`.
    let adjustedWeightedSum = 0
    for (let i = 0; i < files.length; i++) {
      const finished = results[i] !== undefined
      const pct = finished ? 100 : Math.min(progressByIndex[i] ?? 0, 95)
      adjustedWeightedSum += (pct / 100) * weights[i]!
    }

    const rawPercent =
      totalWeight > 0
        ? (adjustedWeightedSum / totalWeight) * 100
        : files.length > 0
          ? (completed / files.length) * 100
          : 0

    const overallPercent =
      completed === files.length
        ? 100
        : Math.min(99, Math.max(completed > 0 || activeCount > 0 ? 1 : 0, Math.floor(rawPercent)))

    return {
      total: files.length,
      completed,
      activeCount,
      overallPercent,
      label:
        files.length === 1
          ? activeFile?.name ?? "Uploading"
          : `${completed}/${files.length} · ${activeFile?.name ?? "Uploading"}`,
    }
  }

  const emitNow = (force = false) => {
    if (!onProgress) return
    const now = Date.now()
    if (!force && now - lastEmitAt < progressThrottleMs) return
    lastEmitAt = now
    onProgress(buildProgress())
  }

  const scheduleEmit = (force = false) => {
    if (!onProgress) return
    if (force) {
      if (emitTimer !== null) {
        window.clearTimeout(emitTimer)
        emitTimer = null
      }
      emitNow(true)
      return
    }

    const now = Date.now()
    if (now - lastEmitAt >= progressThrottleMs) {
      emitNow(true)
      return
    }

    if (emitTimer !== null) return
    emitTimer = window.setTimeout(() => {
      emitTimer = null
      emitNow(true)
    }, progressThrottleMs - (now - lastEmitAt))
  }

  const setFileProgress = (index: number, percent: number) => {
    const previous = progressByIndex[index] ?? 0
    if (previous === percent) return
    progressByIndex[index] = percent
    scheduleEmit()
  }

  scheduleEmit(true)

  async function worker() {
    while (nextIndex < files.length) {
      if (signal?.aborted) return
      const index = nextIndex
      nextIndex += 1
      const file = files[index]!
      activeCount += 1
      scheduleEmit()

      if (maxUploadSizeMb != null && fileExceedsUploadLimit(file.size, maxUploadSizeMb)) {
        setFileProgress(index, 100)
        results[index] = {
          file,
          ok: false,
          error: new Error("File exceeds upload size limit."),
        }
        activeCount -= 1
        completed += 1
        scheduleEmit(completed === files.length)
        continue
      }

      try {
        const result = await uploadFile(connection, file, {
          ...(targetLibraryId ? { targetLibraryId } : {}),
          ...(targetFolderId ? { targetFolderId } : {}),
          signal,
          onProgress: (percent) => {
            setFileProgress(index, percent)
          },
        })
        setFileProgress(index, 100)
        results[index] = { file, ok: true, result }
      } catch (error) {
        setFileProgress(index, 100)
        results[index] = { file, ok: false, error }
      } finally {
        activeCount -= 1
        completed += 1
        scheduleEmit(completed === files.length)
      }
    }
  }

  const workers = Math.min(concurrency, files.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))

  if (emitTimer !== null) {
    window.clearTimeout(emitTimer)
    emitTimer = null
  }
  scheduleEmit(true)

  return results
}
