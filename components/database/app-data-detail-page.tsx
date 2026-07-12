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
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { MobilePageIntro, MobilePageStickyHeader } from "@/components/shell/mobile-page-intro"
import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import {
  createAppDatabaseFolder,
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

function CreateTableSheet({
  open,
  databaseId,
  onClose,
  onCreated,
}: {
  open: boolean
  databaseId: string
  onClose: () => void
  onCreated: () => void
}) {
  const { connection } = useConnection()
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName("")
    setError(null)
  }, [open])

  async function submit() {
    if (!connection || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createAppDatabaseFolder(connection, databaseId, { name: name.trim() })
      onCreated()
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="New table"
      description="Tables group JSON records in this database."
      ariaLabel="New table"
    >
      <div className="flex flex-col gap-4">
        {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Table name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. orders"
          className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[14px] text-[#222222] outline-none focus:border-[var(--arciin-accent,#ff4f12)]"
        />
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => void submit()}
          className="btn-accent-solid flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Table2 className="size-4" />}
          Create table
        </button>
      </div>
    </MobileBottomSheet>
  )
}

function RecordSheet({
  open,
  folderId,
  folderName,
  onClose,
  onCreated,
}: {
  open: boolean
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
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="New record"
      description={`Table: ${folderName}`}
      ariaLabel="New record"
    >
      <div className="flex flex-col gap-4">
        {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--arciin-accent,#ff4f12)]"
        />
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          JSON payload
        </label>
        <textarea
          value={payloadJson}
          onChange={(e) => setPayloadJson(e.target.value)}
          rows={6}
          className="w-full resize-none rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 font-mono text-[12px] outline-none focus:border-[var(--arciin-accent,#ff4f12)]"
        />
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => void submit()}
          className="btn-accent-solid flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add record
        </button>
      </div>
    </MobileBottomSheet>
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
        <Table2 className="text-accent size-4 shrink-0" />
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
              className="accent-dashed-btn mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold"
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
          open={createOpen}
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
  const [createTableOpen, setCreateTableOpen] = useState(false)

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

  const totalRecords = folders.reduce((sum, folder) => sum + folder.recordCount, 0)

  return (
    <div className="flex flex-col gap-4">
      <MobilePageStickyHeader>
        <MobilePageIntro
          title={database?.name ?? "Database"}
          subtitle={
            database?.description ||
            "Each table is a namespace; each row is a JSON document stored in PostgreSQL."
          }
          status={
            loading
              ? "Loading…"
              : `${folders.length} table${folders.length === 1 ? "" : "s"} · ${totalRecords.toLocaleString()} record${totalRecords === 1 ? "" : "s"}`
          }
          cornerIcon={Table2}
          statusIcon={Table2}
          footerRight={
            database?.slug ? (
              <span className="max-w-[9rem] truncate rounded-full border border-[#e5e5e5] bg-white px-2.5 py-1 font-mono text-[10px] text-[#a0a0a0]">
                {database.slug}
              </span>
            ) : undefined
          }
          action={
            <Link
              href="/database/app-data"
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white text-[#717171] active:bg-[#f7f7f7]"
              aria-label="Back to app data"
            >
              <ArrowLeft className="size-4" />
            </Link>
          }
        />

        <div className="mt-1.5 flex items-center gap-2">
          {canWrite ? (
            <button
              type="button"
              onClick={() => setCreateTableOpen(true)}
              className="btn-accent-solid flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-[13px] font-semibold active:opacity-90"
            >
              <Table2 className="size-4" />
              Add table
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className={`flex shrink-0 items-center justify-center rounded-2xl bg-white text-[#717171] disabled:opacity-50 active:bg-[#f7f7f7] ${canWrite ? "size-10" : "h-10 flex-1"}`}
            style={{ border: "1px solid #e5e5e5" }}
            aria-label="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </MobilePageStickyHeader>

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
      ) : folders.length === 0 ? (
        <div
          className="rounded-2xl bg-white px-4 py-10 text-center"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <p className="text-[13px] font-medium text-[#222222]">No tables yet</p>
          <p className="mt-1 text-[12px] text-[#717171]">
            {canWrite
              ? "Tap Add table above — new databases include a Default table automatically."
              : "This database has no tables yet."}
          </p>
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

      {createTableOpen ? (
        <CreateTableSheet
          open={createTableOpen}
          databaseId={databaseId}
          onClose={() => setCreateTableOpen(false)}
          onCreated={() => setRefreshKey((k) => k + 1)}
        />
      ) : null}
    </div>
  )
}
