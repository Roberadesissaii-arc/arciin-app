import { playUploadCompleteSound } from "@/lib/preferences/upload-sound"
import { shouldPlayUploadSound } from "@/lib/preferences/preferences-store"

const SUPPRESS_AFTER_ANNOUNCE_MS = 20_000

export type MobileUploadBatchSummary = {
  total: number
  succeeded: number
  failed: number
}

export type MobileUploadStatusNotice = {
  title: string
  detail?: string
}

type MobileUploadBatchState = MobileUploadBatchSummary & {
  id: string
  announced: boolean
  suppressUntil: number
}

const EVENT_NAME = "arciin:upload-status"

let activeBatch: MobileUploadBatchState | null = null
let clearTimer: number | null = null

function scheduleClear() {
  if (clearTimer !== null) window.clearTimeout(clearTimer)
  clearTimer = window.setTimeout(() => {
    activeBatch = null
    clearTimer = null
  }, SUPPRESS_AFTER_ANNOUNCE_MS)
}

export function beginMobileUploadBatch(total: number) {
  if (clearTimer !== null) {
    window.clearTimeout(clearTimer)
    clearTimer = null
  }
  activeBatch = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    total,
    succeeded: 0,
    failed: 0,
    announced: false,
    suppressUntil: 0,
  }
  return activeBatch.id
}

export function shouldSuppressMobileUploadNotice() {
  if (!activeBatch) return false
  if (!activeBatch.announced) return true
  return Date.now() < activeBatch.suppressUntil
}

function dispatchUploadStatusNotice(notice: MobileUploadStatusNotice) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: notice }))
}

function announceBatch(batch: MobileUploadBatchState, singleFileDetail?: string) {
  if (batch.announced) return
  batch.announced = true
  batch.suppressUntil = Date.now() + SUPPRESS_AFTER_ANNOUNCE_MS

  let title = "Upload complete"
  let detail: string | undefined

  if (batch.total === 1) {
    if (batch.failed > 0) {
      title = "Upload failed"
      detail = undefined
    } else {
      detail = singleFileDetail
    }
  } else if (batch.failed > 0 && batch.succeeded > 0) {
    detail = `${batch.succeeded} uploaded · ${batch.failed} failed`
  } else if (batch.failed > 0) {
    title = batch.total === 1 ? "Upload failed" : `${batch.failed} uploads failed`
  } else {
    detail = `${batch.succeeded} files added`
  }

  dispatchUploadStatusNotice({ title, detail })

  if (batch.succeeded > 0 && shouldPlayUploadSound()) {
    void playUploadCompleteSound()
  }

  scheduleClear()
}

export function isMobileUploadBatchPending() {
  return Boolean(activeBatch && !activeBatch.announced)
}

export function resetMobileUploadBatch() {
  if (typeof window !== "undefined" && clearTimer !== null) {
    window.clearTimeout(clearTimer)
  }
  activeBatch = null
  clearTimer = null
}

/** One client-side summary when a multi-select upload finishes. */
export function finishMobileUploadBatch(
  results: Array<{ ok: boolean }>,
  options?: { singleFileDetail?: string },
) {
  if (!activeBatch) return

  activeBatch.succeeded = results.filter((item) => item.ok).length
  activeBatch.failed = results.filter((item) => !item.ok).length
  announceBatch(activeBatch, options?.singleFileDetail)
}

export function subscribeMobileUploadStatus(listener: (notice: MobileUploadStatusNotice) => void) {
  if (typeof window === "undefined") return () => {}
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<MobileUploadStatusNotice>).detail
    if (detail?.title) listener(detail)
  }
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}
