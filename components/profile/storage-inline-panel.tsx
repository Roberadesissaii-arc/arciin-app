"use client"

import { useCallback, useEffect, useState } from "react"
import { FolderTree, HardDrive, Loader2, Save } from "lucide-react"

import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { formatApiError } from "@/lib/api/errors"
import { getStorageSettings, updateStorageSettings } from "@/lib/api/settings"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import { formatBytes } from "@/lib/utils/format-bytes"
import type { StorageSettings } from "@/lib/types/models"

const LAYOUT_HINTS = [
  { label: "objects", hint: "Binary blobs keyed by object ID" },
  { label: "libraries", hint: "Library-scoped file trees" },
  { label: "thumbnails", hint: "Generated previews" },
  { label: "temp", hint: "Upload and job scratch space" },
  { label: "logs", hint: "Optional local logs" },
]

export function StorageInlinePanel({ enabled }: { enabled: boolean }) {
  const load = useCallback(
    (connection: Parameters<typeof getStorageSettings>[0], signal: AbortSignal) =>
      getStorageSettings(connection, signal),
    [],
  )

  const { data, loading, error, connection } = useStablePanelLoad(enabled, load, {
    cacheKey: "storage",
  })
  const [path, setPath] = useState("")
  const [initialPath, setInitialPath] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    const root = data.storageRoot ?? ""
    setPath(root)
    setInitialPath(root)
  }, [data])

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

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  if (error && !data) {
    return <p className="text-[12px] text-[#b91c1c]">{error}</p>
  }

  const usage = data as StorageSettings | null
  const usagePct =
    usage?.totalBytes && usage.totalBytes > 0
      ? Math.min(100, Math.round((usage.usageBytes / usage.totalBytes) * 100))
      : null

  return (
    <div className="flex flex-col gap-4">
      <SettingsIntroCard
        icon={HardDrive}
        title="Instance storage"
        description="Files and libraries are stored on disk under your configured root path on this server."
      />

      <div className="rounded-xl bg-[#f7f7f7] p-3" style={{ border: "1px solid #e5e5e5" }}>
        <div className="mb-2 flex items-center gap-2">
          <HardDrive className="size-4 text-[#717171]" />
          <span className="text-[13px] font-semibold text-[#222222]">Volume usage</span>
          <span className="ml-auto text-[11px] text-[#a0a0a0]">
            {usage?.totalBytes
              ? `${formatBytes(usage.usageBytes)} / ${formatBytes(usage.totalBytes)}`
              : formatBytes(usage?.usageBytes ?? 0)}
          </span>
        </div>
        {usagePct !== null ? (
          <div className="h-2 overflow-hidden rounded-full bg-[#ececec]">
            <div className="h-full rounded-full bg-[#ff4f12]" style={{ width: `${usagePct}%` }} />
          </div>
        ) : null}
        <div className="mt-2 flex justify-between text-[11px] text-[#a0a0a0]">
          <span>{(usage?.objectCount ?? 0).toLocaleString()} objects</span>
          <span>{usagePct != null ? `${usagePct}% full` : usage?.writable === false ? "Read-only" : ""}</span>
        </div>
      </div>

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
          className="rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[13px] text-[#222222] outline-none focus:bg-white"
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

      {saveError ? (
        <p className="rounded-xl px-3 py-2 text-[12px] text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca]">
          {saveError}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl px-3 py-2 text-[12px] text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0]">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!path.trim() || path.trim() === initialPath || saving}
        onClick={() => void handleSave()}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff4f12] text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save storage path
      </button>
    </div>
  )
}
