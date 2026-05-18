"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Table2,
  Trash2,
  X,
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import {
  createFolderRecord,
  deleteFolderRecord,
  getAppDatabase,
  listAppDatabaseFolders,
  listFolderRecords,
} from "@/lib/api/app-databases"
import { formatApiError } from "@/lib/api/errors"
import type {
  AppDatabaseFolderSummary,
  AppDatabaseRecordSummary,
  AppDatabaseSummary,
} from "@/lib/types/database"

function RecordSheet({
  folderId,
  folderName,
  onClose,
  onCreated,
}: {
  folderId: string
  folderName: string
  onClose: () => void
  onCreated: () => void
}) {
  const { connection } = useConnection()
  const [name, setName] = useState("")
  const [payloadJson, setPayloadJson] = useState('{\n  "key": "value"\n}')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!connection || !name.trim()) return
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(payloadJson) as Record<string, unknown>
    } catch {
      setError("Payload must be valid JSON.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createFolderRecord(connection, folderId, { name: name.trim(), payload })
      onCreated()
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-5"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#222222]">New record</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="size-5 text-[#717171]" />
          </button>
        </div>
        <p className="mb-3 text-[12px] text-[#717171]">Table: {folderName}</p>
        {error ? <p className="mb-3 text-[12px] text-[#b91c1c]">{error}</p> : null}
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[14px] outline-none focus:border-[#ff4f12]"
        />
        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          JSON payload
        </label>
        <textarea
          value={payloadJson}
          onChange={(e) => setPayloadJson(e.target.value)}
          rows={6}
          className="mt-1.5 w-full resize-none rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 font-mono text-[12px] outline-none focus:border-[#ff4f12]"
        />
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => void submit()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#ff4f12" }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add record
        </button>
      </div>
    </div>
  )
}

function FolderSection({
  folder,
  canWrite,
  connection,
  onRecordsChanged,
}: {
  folder: AppDatabaseFolderSummary
  canWrite: boolean
  connection: NonNullable<ReturnType<typeof useConnection>["connection"]>
  onRecordsChanged: () => void
}) {
  const [open, setOpen] = useState(folder.name === "Default")
  const [records, setRecords] = useState<AppDatabaseRecordSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRecords(await listFolderRecords(connection, folder.id))
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [connection, folder.id])

  useEffect(() => {
    if (!open) return
    void loadRecords()
  }, [open, loadRecords])

  async function removeRecord(recordId: string) {
    try {
      await deleteFolderRecord(connection, recordId)
      setRecords((prev) => prev.filter((r) => r.id !== recordId))
      onRecordsChanged()
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  return (
    <li
      className="overflow-hidden rounded-2xl bg-white"
      style={{ border: "1px solid #e5e5e5" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-[#fafafa]"
      >
        <Table2 className="size-4 shrink-0 text-[#ff4f12]" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">{folder.name}</p>
          <p className="text-[11px] text-[#a0a0a0]">
            {folder.recordCount} record{folder.recordCount === 1 ? "" : "s"}
          </p>
        </div>
        {open ? (
          <ChevronDown className="size-4 text-[#c0c0c0]" />
        ) : (
          <ChevronRight className="size-4 text-[#c0c0c0]" />
        )}
      </button>

      {open ? (
        <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-2">
          {error ? <p className="mb-2 text-[12px] text-[#b91c1c]">{error}</p> : null}
          {canWrite ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold text-[#ff4f12]"
              style={{ border: "1px dashed rgba(255,79,18,0.4)", background: "#fff7f4" }}
            >
              <Plus className="size-3.5" />
              Add record
            </button>
          ) : null}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-[#c0c0c0]" />
            </div>
          ) : records.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-[#a0a0a0]">No records</p>
          ) : (
            <ul className="space-y-2">
              {records.map((record) => (
                <li
                  key={record.id}
                  className="rounded-xl bg-[#f7f7f7] px-3 py-2.5"
                  style={{ border: "1px solid #ececec" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#222222]">{record.name}</p>
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() => void removeRecord(record.id)}
                        className="shrink-0 p-0.5 text-[#a0a0a0] active:text-[#ef4444]"
                        aria-label={`Delete ${record.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <pre className="mt-1.5 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-[#717171]">
                    {JSON.stringify(record.payload, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {createOpen ? (
        <RecordSheet
          folderId={folder.id}
          folderName={folder.name}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            void loadRecords()
            onRecordsChanged()
          }}
        />
      ) : null}
    </li>
  )
}

export function AppDataDetailPage({ databaseId }: { databaseId: string }) {
  const { connection, ready } = useConnection()
  const [database, setDatabase] = useState<AppDatabaseSummary | null>(null)
  const [folders, setFolders] = useState<AppDatabaseFolderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!connection) return
      setLoading(true)
      setError(null)
      try {
        const [db, folderList] = await Promise.all([
          getAppDatabase(connection, databaseId, signal),
          listAppDatabaseFolders(connection, databaseId, signal),
        ])
        if (signal?.aborted) return
        setDatabase(db)
        setFolders(folderList)
      } catch (err) {
        if (!signal?.aborted) setError(formatApiError(err))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [connection, databaseId],
  )

  useEffect(() => {
    if (!ready || !connection) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection, load, refreshKey])

  const canWrite =
    connection?.user.role === "OWNER" ||
    connection?.user.role === "ADMIN" ||
    connection?.user.role === "MEMBER"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          href="/database/app-data"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#717171]"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h2
            className="truncate text-[20px] font-bold text-[#222222]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            {database?.name ?? "Database"}
          </h2>
          {database?.description ? (
            <p className="truncate text-[12px] text-[#717171]">{database.description}</p>
          ) : (
            <p className="text-[12px] text-[#a0a0a0] font-mono">{database?.slug}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="flex size-9 items-center justify-center rounded-xl bg-white text-[#717171]"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Refresh"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-7 animate-spin text-[#c0c0c0]" />
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {folders.map((folder) =>
            connection ? (
              <FolderSection
                key={folder.id}
                folder={folder}
                canWrite={canWrite}
                connection={connection}
                onRecordsChanged={() => setRefreshKey((k) => k + 1)}
              />
            ) : null,
          )}
        </ul>
      )}
    </div>
  )
}
