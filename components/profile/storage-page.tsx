"use client"

import { useEffect, useState } from "react"
import { FolderTree, HardDrive, Loader2, Save, Server } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { getStorageSettings, updateStorageSettings } from "@/lib/api/settings"
import { formatBytes } from "@/lib/utils/format-bytes"

const LAYOUT_HINTS = [
  { label: "objects", hint: "Binary blobs keyed by object ID" },
  { label: "libraries", hint: "Library-scoped file trees" },
  { label: "thumbnails", hint: "Generated previews" },
  { label: "temp", hint: "Upload and job scratch space" },
  { label: "logs", hint: "Optional local logs" },
]

export function StoragePage() {
  const { connection, ready } = useConnection()
  const [path, setPath] = useState("")
  const [initialPath, setInitialPath] = useState("")
  const [usage, setUsage] = useState<{
    usageBytes: number
    totalBytes: number | null
    objectCount: number
    writable: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !connection) return
    let cancelled = false
    const ac = new AbortController()

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getStorageSettings(connection, ac.signal)
        if (cancelled) return
        const root = data.storageRoot ?? ""
        setPath(root)
        setInitialPath(root)
        setUsage({
          usageBytes: data.usageBytes,
          totalBytes: data.totalBytes ?? null,
          objectCount: data.objectCount,
          writable: data.writable,
        })
      } catch (err) {
        if (!cancelled) setError(formatApiError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [connection, ready])

  const usagePct =
    usage?.totalBytes && usage.totalBytes > 0
      ? Math.min(100, Math.round((usage.usageBytes / usage.totalBytes) * 100))
      : null

  async function handleSave() {
    if (!connection || !path.trim() || path.trim() === initialPath) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const data = await updateStorageSettings(connection, path.trim())
      const root = data.storageRoot ?? path.trim()
      setPath(root)
      setInitialPath(root)
      setUsage({
        usageBytes: data.usageBytes,
        totalBytes: data.totalBytes ?? null,
        objectCount: data.objectCount,
        writable: data.writable,
      })
      setMessage("Storage path updated.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (!ready || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#a0a0a0]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex flex-col gap-3 rounded-2xl bg-white p-4"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex size-7 items-center justify-center rounded-xl bg-[#f7f7f7]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <HardDrive className="size-[14px] text-[#717171]" />
          </div>
          <span className="text-[13px] font-semibold text-[#222222]">Volume usage</span>
          <span className="ml-auto text-[12px] text-[#a0a0a0]">
            {usage?.totalBytes
              ? `${formatBytes(usage.usageBytes)} of ${formatBytes(usage.totalBytes)}`
              : `${formatBytes(usage?.usageBytes ?? 0)} used`}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#f0f0f0]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${usagePct ?? 0}%`,
              backgroundColor: "#ff4f12",
            }}
          />
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[#a0a0a0]">
            {usage ? `${usage.objectCount} stored object${usage.objectCount === 1 ? "" : "s"}` : "—"}
          </span>
          <span className="font-medium text-[#717171]">
            {usagePct != null ? `${usagePct}% full` : usage?.writable === false ? "Read-only" : "—"}
          </span>
        </div>
      </div>

      <div
        className="flex flex-col gap-4 rounded-2xl bg-white p-5"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="flex items-center gap-2">
          <Server className="size-4 text-[#717171]" />
          <p className="text-[13px] font-semibold text-[#222222]">Storage root</p>
        </div>
        <p className="text-[12px] leading-relaxed text-[#717171]">
          All files and libraries are stored under this path on your server. Use an absolute path.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="storage-root" className="text-[12px] font-semibold text-[#717171]">
            Root path
          </label>
          <input
            id="storage-root"
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/data/arciin"
            className="rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[13px] text-[#222222] outline-none placeholder-[#c0c0c0] focus:bg-white"
            style={{ border: "1px solid #e5e5e5" }}
          />
        </div>
        {error ? (
          <p className="text-[12px] text-[#b91c1c]">{error}</p>
        ) : null}
        {message ? (
          <p className="text-[12px] text-[#15803d]">{message}</p>
        ) : null}
        <button
          type="button"
          disabled={!path.trim() || path.trim() === initialPath || saving}
          onClick={() => void handleSave()}
          className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-semibold text-white disabled:opacity-40 active:opacity-80"
          style={{ backgroundColor: "#ff4f12" }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save path
        </button>
      </div>

      <div
        className="flex flex-col gap-3 rounded-2xl bg-white p-5"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="flex items-center gap-2">
          <FolderTree className="size-4 text-[#717171]" />
          <p className="text-[13px] font-semibold text-[#222222]">Expected folder layout</p>
        </div>
        <div className="flex flex-col gap-2">
          {LAYOUT_HINTS.map(({ label, hint }) => (
            <div key={label} className="flex items-start gap-3">
              <code
                className="shrink-0 rounded-lg px-2.5 py-1 font-mono text-[12px] text-[#717171]"
                style={{ backgroundColor: "#f7f7f7", border: "1px solid #e5e5e5" }}
              >
                /{label}
              </code>
              <span className="pt-0.5 text-[12px] leading-relaxed text-[#a0a0a0]">{hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
