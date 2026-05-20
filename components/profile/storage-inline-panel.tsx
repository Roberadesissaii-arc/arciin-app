"use client"

import { useCallback, useEffect, useState } from "react"
import { BadgeCheck, FolderTree, HardDrive, Loader2, RefreshCw, Save } from "lucide-react"

import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { formatApiError } from "@/lib/api/errors"
import { getStorageSettings, getStorageVolumes, updateStorageSettings } from "@/lib/api/settings"
import { getUserPreferences, updateUserPreferences } from "@/lib/api/user-preferences"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import { suppressFetchErrorWhenOffline } from "@/lib/connection/offline-ui"
import { useConnection } from "@/components/providers/connection-provider"
import { formatBytes } from "@/lib/utils/format-bytes"
import type { StorageSettings, StorageVolumeOption, StorageVolumesResponse } from "@/lib/types/models"

function formatVolumeFree(option: StorageVolumeOption) {
  if (option.availableBytes == null) return "Space unknown"
  const total = option.totalBytes != null ? formatBytes(option.totalBytes) : "?"
  return `${formatBytes(option.availableBytes)} free of ${total}`
}

const LAYOUT_HINTS = [
  { label: "objects", hint: "Binary blobs keyed by object ID" },
  { label: "libraries", hint: "Library-scoped file trees" },
  { label: "thumbnails", hint: "Generated previews" },
  { label: "temp", hint: "Upload and job scratch space" },
  { label: "logs", hint: "Optional local logs" },
]

function DrivesSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-1" aria-hidden>
      <div className="h-14 animate-pulse rounded-lg bg-[#ececec]" />
      <div className="h-14 animate-pulse rounded-lg bg-[#ececec]" />
    </div>
  )
}

export function StorageInlinePanel({ enabled }: { enabled: boolean }) {
  const { serverReachable } = useConnection()
  const settingsLoader = useCallback(
    (connection: Parameters<typeof getStorageSettings>[0], signal: AbortSignal) =>
      getStorageSettings(connection, signal),
    [],
  )

  const volumesLoader = useCallback(
    (conn: Parameters<typeof getStorageVolumes>[0], signal: AbortSignal) =>
      getStorageVolumes(conn, signal),
    [],
  )

  const {
    data,
    loading: settingsLoading,
    error: settingsError,
    connection,
  } = useStablePanelLoad(enabled, settingsLoader, { cacheKey: "storage" })

  const {
    data: volumesData,
    loading: volumesWaiting,
    isRevalidating: volumesRefreshing,
    error: volumesError,
    reload: reloadVolumes,
  } = useStablePanelLoad<StorageVolumesResponse>(enabled, volumesLoader, {
    cacheKey: "storage-volumes",
    staleTimeMs: 120_000,
  })

  const [path, setPath] = useState("")
  const [initialPath, setInitialPath] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [docThumbs, setDocThumbs] = useState(false)
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    const root = data.storageRoot ?? ""
    setPath(root)
    setInitialPath(root)
  }, [data])

  useEffect(() => {
    if (!enabled || !connection) return
    let cancelled = false
    void getUserPreferences(connection)
      .then((prefs) => {
        if (!cancelled) setDocThumbs(prefs.media?.documentThumbnails ?? false)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [enabled, connection])

  async function toggleDocThumbs(next: boolean) {
    if (!connection) return
    setPrefsSaving(true)
    setPrefsError(null)
    const prev = docThumbs
    setDocThumbs(next)
    try {
      const prefs = await updateUserPreferences(connection, {
        media: { documentThumbnails: next },
      })
      setDocThumbs(prefs.media?.documentThumbnails ?? next)
      setMessage(next ? "PDF previews enabled." : "PDF previews disabled.")
    } catch (err) {
      setDocThumbs(prev)
      setPrefsError(formatApiError(err))
    } finally {
      setPrefsSaving(false)
    }
  }

  async function handleSave() {
    if (!connection || !path.trim() || path.trim() === initialPath) return
    setSaving(true)
    setSaveError(null)
    setMessage(null)
    try {
      const updated = await updateStorageSettings(connection, path.trim())
      const root = updated.storageRoot ?? path.trim()
      setPath(root)
      setInitialPath(root)
      setMessage("Storage path updated.")
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

  const volumes = volumesData?.volumes ?? []
  const volumesNote = volumesData?.installNotes?.[0] ?? null
  const showVolumesSkeleton = volumesWaiting && volumes.length === 0
  const volumesErrorText = volumesError
    ? volumesError
    : null

  return (
    <div className="flex flex-col gap-4">
      <SettingsIntroCard
        icon={HardDrive}
        title="Instance storage"
        description="Files and libraries are stored on disk under your configured root path on this server."
      />

      {suppressFetchErrorWhenOffline(serverReachable, settingsError) && !usage ? (
        <p className="text-[12px] text-[#b91c1c]">
          {suppressFetchErrorWhenOffline(serverReachable, settingsError)}
        </p>
      ) : null}

      <div className="rounded-xl bg-[#f7f7f7] p-3" style={{ border: "1px solid #e5e5e5" }}>
        <div className="mb-2 flex items-center gap-2">
          <HardDrive className="size-4 text-[#717171]" />
          <span className="text-[13px] font-semibold text-[#222222]">Volume usage</span>
          {settingsLoading && !usage ? (
            <Loader2 className="ml-auto size-3.5 animate-spin text-[#c0c0c0]" />
          ) : (
            <span className="ml-auto text-[11px] text-[#a0a0a0]">
              {usage?.totalBytes
                ? `${formatBytes(usage.usageBytes)} / ${formatBytes(usage.totalBytes)}`
                : formatBytes(usage?.usageBytes ?? 0)}
            </span>
          )}
        </div>
        {settingsLoading && !usage ? (
          <div className="mt-2 h-2 animate-pulse rounded-full bg-[#ececec]" />
        ) : usagePct !== null ? (
          <div className="h-2 overflow-hidden rounded-full bg-[#ececec]">
            <div className="h-full rounded-full bg-[#ff4f12]" style={{ width: `${usagePct}%` }} />
          </div>
        ) : (
          <div className="h-2 rounded-full bg-[#ececec]" />
        )}
        <div className="mt-2 flex justify-between text-[11px] text-[#a0a0a0]">
          <span>
            {settingsLoading && !usage
              ? "Loading…"
              : `${(usage?.objectCount ?? 0).toLocaleString()} objects`}
          </span>
          <span>
            {usagePct != null
              ? `${usagePct}% full`
              : usage?.writable === false
                ? "Read-only"
                : ""}
          </span>
        </div>
      </div>

      <div
        className="rounded-xl bg-[#f7f7f7] p-3"
        style={{ border: "1px solid #e5e5e5", minHeight: showVolumesSkeleton ? 140 : undefined }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[12px] font-semibold text-[#222222]">Detected drives</p>
          <button
            type="button"
            disabled={volumesRefreshing}
            onClick={() => reloadVolumes()}
            className="flex items-center gap-1 text-[11px] font-medium text-[#717171] disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 ${volumesRefreshing ? "animate-spin" : ""}`}
            />
            {volumesRefreshing ? "Updating…" : "Rescan"}
          </button>
        </div>

        {showVolumesSkeleton ? (
          <DrivesSkeleton />
        ) : volumesErrorText ? (
          <p className="py-2 text-[12px] text-[#a0a0a0]">{volumesErrorText}</p>
        ) : volumes.length === 0 ? (
          <p className="py-2 text-[12px] text-[#a0a0a0]">
            No volumes reported. Mount a drive on the server, then rescan.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {volumes.map((vol) => (
              <li
                key={vol.id}
                className="rounded-lg px-2.5 py-2"
                style={{
                  border: vol.isCurrent ? "1px solid #ff4f12" : "1px solid #e5e5e5",
                  backgroundColor: vol.isCurrent ? "rgba(255,79,18,0.06)" : "#fff",
                }}
              >
                <div className="flex items-start gap-2">
                  {vol.isCurrent ? (
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#ff4f12]" aria-hidden />
                  ) : (
                    <HardDrive className="mt-0.5 size-4 shrink-0 text-[#a0a0a0]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[12px] font-medium text-[#222222]">{vol.label}</p>
                      {vol.isCurrent ? (
                        <span className="rounded-md bg-[#ff4f12]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#ff4f12]">
                          In use
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate font-mono text-[10px] text-[#a0a0a0]">{vol.arciinPath}</p>
                    <p className="mt-0.5 text-[10px] text-[#a0a0a0]">{formatVolumeFree(vol)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {volumesNote && !showVolumesSkeleton ? (
          <p className="mt-2 text-[10px] leading-relaxed text-[#a0a0a0]">{volumesNote}</p>
        ) : null}
        <p className="mt-2 text-[10px] text-[#a0a0a0]">
          To move all files to another disk, open Storage on the Arciin desktop app (owner/admin).
        </p>
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
          disabled={settingsLoading && !usage}
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

      <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
        <p className="py-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Technical
        </p>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-[#222222]">PDF previews</p>
            <p className="text-[11px] text-[#a0a0a0]">
              First-page thumbnails for PDFs in file grids. Off by default.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={docThumbs}
            disabled={prefsSaving}
            onClick={() => void toggleDocThumbs(!docThumbs)}
            className="relative shrink-0 disabled:opacity-50"
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: docThumbs ? "#ff4f12" : "#e5e5e5",
            }}
          >
            <span
              className="absolute top-[3px] size-5 rounded-full bg-white shadow-sm transition-transform"
              style={{ left: 3, transform: docThumbs ? "translateX(18px)" : "translateX(0)" }}
            />
          </button>
        </div>
      </div>

      {prefsError ? (
        <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
          {prefsError}
        </p>
      ) : null}

      {saveError ? (
        <p className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
          {saveError}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[12px] text-[#15803d]">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!path.trim() || path.trim() === initialPath || saving || (settingsLoading && !usage)}
        onClick={() => void handleSave()}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff4f12] text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save storage path
      </button>
    </div>
  )
}
