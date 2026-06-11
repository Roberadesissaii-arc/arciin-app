"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FolderTree, HardDrive, Loader2, Save } from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { formatApiError } from "@/lib/api/errors"
import {
  getStorageSettings,
  getUploadSettings,
  updateStorageSettings,
  updateUploadSettings,
} from "@/lib/api/settings"
import {
  DEFAULT_MAX_UPLOAD_SIZE_MB,
  DEFAULT_UPLOAD_RATE_LIMIT_PER_MINUTE,
  uploadGbInputToMb,
  uploadMbToGbLabel,
} from "@/lib/constants/upload-limits"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import { suppressFetchErrorWhenOffline } from "@/lib/connection/offline-ui"
import { useConnection } from "@/components/providers/connection-provider"
import { formatBytes } from "@/lib/utils/format-bytes"

const LAYOUT_HINTS = [
  { label: "objects", hint: "Binary blobs keyed by object ID" },
  { label: "libraries", hint: "Library-scoped file trees" },
  { label: "thumbnails", hint: "Generated previews" },
  { label: "temp", hint: "Upload and job scratch space" },
  { label: "logs", hint: "Optional local logs" },
]

const PLAIN_NUMERIC_INPUT =
  "rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[14px] text-[#222222] outline-none focus:bg-white arciin-plain-number-input"

export function StorageInlinePanel({ enabled }: { enabled: boolean }) {
  const { serverReachable } = useConnection()
  const settingsLoader = useCallback(
    (connection: Parameters<typeof getStorageSettings>[0], signal: AbortSignal) =>
      getStorageSettings(connection, signal),
    [],
  )
  const uploadLimitsLoader = useCallback(
    (connection: Parameters<typeof getUploadSettings>[0], signal: AbortSignal) =>
      getUploadSettings(connection, signal),
    [],
  )

  const {
    data,
    loading: settingsLoading,
    error: settingsError,
    showingCachedOffline: settingsOffline,
    isRevalidating: settingsRevalidating,
    connection,
    reload: reloadSettings,
  } = useStablePanelLoad(enabled, settingsLoader, {
    cacheKey: "storage",
    staleTimeMs: 120_000,
  })

  const {
    data: uploadLimits,
    loading: limitsWaiting,
    isRevalidating: limitsRevalidating,
    error: limitsFetchError,
    setData: setUploadLimits,
    reload: reloadUploadLimits,
  } = useStablePanelLoad(enabled, uploadLimitsLoader, {
    cacheKey: "upload-limits",
    staleTimeMs: 120_000,
  })

  const [path, setPath] = useState("")
  const [initialPath, setInitialPath] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage(enabled)
  const [uploadLimitGb, setUploadLimitGb] = useState(() =>
    uploadMbToGbLabel(DEFAULT_MAX_UPLOAD_SIZE_MB),
  )
  const [uploadRateLimit, setUploadRateLimit] = useState(String(DEFAULT_UPLOAD_RATE_LIMIT_PER_MINUTE))
  const [limitsSaving, setLimitsSaving] = useState(false)
  const [limitsError, setLimitsError] = useState<string | null>(null)
  const limitsSyncedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!data) return
    const root = data.storageRoot ?? ""
    setPath(root)
    setInitialPath(root)
  }, [data])

  useEffect(() => {
    if (!uploadLimits) return
    const key = `${uploadLimits.maxUploadSizeMb}:${uploadLimits.uploadRateLimitPerMinute}`
    if (limitsSyncedRef.current === key) return
    limitsSyncedRef.current = key
    setUploadLimitGb(uploadMbToGbLabel(uploadLimits.maxUploadSizeMb))
    setUploadRateLimit(String(uploadLimits.uploadRateLimitPerMinute))
  }, [uploadLimits])

  useEffect(() => {
    if (!enabled) limitsSyncedRef.current = null
  }, [enabled])

  async function handleSaveUploadLimits() {
    if (!connection) return
    const maxUploadSizeMb = uploadGbInputToMb(uploadLimitGb)
    const uploadRateLimitPerMinute = Number.parseInt(uploadRateLimit, 10)
    if (maxUploadSizeMb == null) {
      setLimitsError("Enter a valid max file size in GB (e.g. 20).")
      return
    }
    if (!Number.isFinite(uploadRateLimitPerMinute) || uploadRateLimitPerMinute < 1) {
      setLimitsError("Rate limit must be at least 1 upload per minute.")
      return
    }
    setLimitsSaving(true)
    setLimitsError(null)
    clearStatus()
    try {
      const updated = await updateUploadSettings(connection, {
        maxUploadSizeMb,
        uploadRateLimitPerMinute,
      })
      setUploadLimits(updated, { fromFetch: true })
      limitsSyncedRef.current = `${updated.maxUploadSizeMb}:${updated.uploadRateLimitPerMinute}`
      setUploadLimitGb(uploadMbToGbLabel(updated.maxUploadSizeMb))
      setUploadRateLimit(String(updated.uploadRateLimitPerMinute))
      const gbLabel = uploadMbToGbLabel(updated.maxUploadSizeMb)
      showStatus(
        updated.webProxyRestartRequired
          ? {
              title: "Upload limits saved",
              detail: `Restart the mobile app to allow files over ${uploadMbToGbLabel(updated.webProxyMaxUploadSizeMb)} GB · ${gbLabel} GB per file`,
            }
          : {
              title: "Upload limits saved",
              detail: `${gbLabel} GB per file`,
            },
      )
    } catch (err) {
      setLimitsError(formatApiError(err))
    } finally {
      setLimitsSaving(false)
    }
  }

  async function handleSave() {
    if (!connection || !path.trim() || path.trim() === initialPath) return
    setSaving(true)
    setSaveError(null)
    clearStatus()
    try {
      const updated = await updateStorageSettings(connection, path.trim())
      const root = updated.storageRoot ?? path.trim()
      setPath(root)
      setInitialPath(root)
      showStatus({ title: "Storage path updated", detail: "Saved" })
    } catch (err) {
      setSaveError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (!enabled) return null

  const usage = data
  const usagePct =
    usage?.totalBytes && usage.totalBytes > 0
      ? Math.min(100, Math.round((usage.usageBytes / usage.totalBytes) * 100))
      : null
  const showUsageSkeleton = settingsLoading && !usage
  const showLimitsSkeleton = limitsWaiting && !uploadLimits
  const limitsErrorText =
    limitsError ?? suppressFetchErrorWhenOffline(serverReachable, limitsFetchError)
  const previewMb =
    uploadGbInputToMb(uploadLimitGb) ?? uploadLimits?.maxUploadSizeMb ?? DEFAULT_MAX_UPLOAD_SIZE_MB

  return (
    <div className="flex flex-col gap-4">
      <AdminSettingsGate feature="Instance storage">
        <>
          <SettingsIntroCard
            icon={HardDrive}
            title="Instance storage"
            description="Files and libraries are stored on disk under your configured root path on this server."
          />

          {settingsOffline ? (
            <OfflineCachedNotice revalidating={settingsRevalidating} />
          ) : null}

          {suppressFetchErrorWhenOffline(serverReachable, settingsError) && !usage ? (
            <MutedPanelError
              error={suppressFetchErrorWhenOffline(serverReachable, settingsError)}
              onRetry={() => void reloadSettings()}
            />
          ) : null}

          <div className="rounded-xl bg-[#f7f7f7] p-3" style={{ border: "1px solid #e5e5e5" }}>
            <div className="mb-2 flex items-center gap-2">
              <HardDrive className="size-4 text-[#717171]" />
              <span className="text-[13px] font-semibold text-[#222222]">Volume usage</span>
              {settingsRevalidating ? (
                <Loader2 className="ml-auto size-3.5 animate-spin text-[#c0c0c0]" aria-hidden />
              ) : (
                <span className="ml-auto text-[11px] text-[#a0a0a0]">
                  {usage?.totalBytes
                    ? `${formatBytes(usage.usageBytes)} / ${formatBytes(usage.totalBytes)}`
                    : formatBytes(usage?.usageBytes ?? 0)}
                </span>
              )}
            </div>
            {showUsageSkeleton ? (
              <div className="mt-2 h-2 animate-pulse rounded-full bg-[#ececec]" />
            ) : usagePct !== null ? (
              <div className="h-2 overflow-hidden rounded-full bg-[#ececec]">
                <div
                  className="accent-progress-fill h-full rounded-full"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            ) : (
              <div className="h-2 rounded-full bg-[#ececec]" />
            )}
            <div className="mt-2 flex justify-between text-[11px] text-[#a0a0a0]">
              <span>{`${(usage?.objectCount ?? 0).toLocaleString()} objects`}</span>
              <span>
                {usagePct != null
                  ? `${usagePct}% full`
                  : usage?.writable === false
                    ? "Read-only"
                    : ""}
              </span>
            </div>
          </div>

          {usage?.isDockerRuntime && usage.hostStorageRoot ? (
            <p className="text-[11px] leading-relaxed text-[#a0a0a0]">
              Docker host folder:{" "}
              <span className="font-mono text-[#222222]">{usage.hostStorageRoot}</span>
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="storage-root-inline" className="text-[12px] font-semibold text-[#717171]">
              Storage root path
            </label>
            <input
              id="storage-root-inline"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/data/arciin"
              disabled={showUsageSkeleton}
              className="rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[13px] text-[#222222] outline-none focus:bg-white disabled:opacity-60"
              style={{ border: "1px solid #e5e5e5" }}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <FolderTree className="size-4 text-[#717171]" />
              <p className="text-[12px] font-semibold text-[#222222]">Expected layout</p>
            </div>
            <div className="flex flex-col gap-2">
              {LAYOUT_HINTS.map(({ label, hint }) => (
                <div key={label} className="flex items-start gap-2">
                  <code
                    className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] text-[#717171]"
                    style={{ backgroundColor: "#fff", border: "1px solid #e5e5e5" }}
                  >
                    /{label}
                  </code>
                  <span className="text-[11px] leading-relaxed text-[#a0a0a0]">{hint}</span>
                </div>
              ))}
            </div>
          </div>

          {saveError ? <MutedPanelError error={saveError} /> : null}

          <button
            type="button"
            disabled={!path.trim() || path.trim() === initialPath || saving || showUsageSkeleton}
            onClick={() => void handleSave()}
            className="btn-accent-solid flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save storage path
          </button>

          <div
            className="mt-2 rounded-xl bg-white p-3"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[#222222]">Upload limits</p>
              {limitsRevalidating ? (
                <Loader2 className="ml-auto size-3.5 animate-spin text-[#c0c0c0]" aria-hidden />
              ) : null}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#a0a0a0]">
              Per-file size and how many uploads each user can start per minute. Default is 20 GB per
              file.
            </p>
            {showLimitsSkeleton ? (
              <div className="mt-3 flex flex-col gap-2" aria-hidden>
                <div className="h-11 animate-pulse rounded-xl bg-[#ececec]" />
                <div className="h-11 animate-pulse rounded-xl bg-[#ececec]" />
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="upload-max-gb" className="text-[12px] font-semibold text-[#717171]">
                    Max file size (GB)
                  </label>
                  <input
                    id="upload-max-gb"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={uploadLimitGb}
                    onChange={(e) => setUploadLimitGb(e.target.value)}
                    className={PLAIN_NUMERIC_INPUT}
                    style={{ border: "1px solid #e5e5e5" }}
                  />
                  <p className="text-[10px] text-[#a0a0a0]">≈ {formatBytes(previewMb * 1024 * 1024)} per file</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="upload-rate" className="text-[12px] font-semibold text-[#717171]">
                    Uploads per minute (per user)
                  </label>
                  <input
                    id="upload-rate"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={uploadRateLimit}
                    onChange={(e) => setUploadRateLimit(e.target.value.replace(/\D/g, ""))}
                    className={PLAIN_NUMERIC_INPUT}
                    style={{ border: "1px solid #e5e5e5" }}
                  />
                </div>
                {limitsErrorText ? (
                  <MutedPanelError
                    error={limitsErrorText}
                    onRetry={() => void reloadUploadLimits()}
                  />
                ) : null}
                <button
                  type="button"
                  disabled={limitsSaving || showLimitsSkeleton}
                  onClick={() => void handleSaveUploadLimits()}
                  className="btn-accent-solid flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
                >
                  {limitsSaving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Save upload limits
                </button>
              </div>
            )}
          </div>
        </>
      </AdminSettingsGate>

      <PanelStatusBanner message={message} />
    </div>
  )
}
