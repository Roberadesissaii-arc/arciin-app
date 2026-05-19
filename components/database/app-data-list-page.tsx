"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronRight,
  Layers2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { createAppDatabase, deleteAppDatabase, listAppDatabases } from "@/lib/api/app-databases"
import { formatApiError } from "@/lib/api/errors"
import type { AppDatabaseSummary } from "@/lib/types/database"
import { formatRelativeDate } from "@/lib/utils/format-date"

const ADJ = ["bright", "swift", "calm", "deep", "fresh", "golden"]
const NOUN = ["store", "hub", "base", "vault", "pool", "node"]

function randomName() {
  return `${ADJ[Math.floor(Math.random() * ADJ.length)]}-${NOUN[Math.floor(Math.random() * NOUN.length)]}`
}

function CreateSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const { connection } = useConnection()
  const [name, setName] = useState(() => randomName())
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!connection || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createAppDatabase(connection, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
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
        className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white px-5 pb-8 pt-5"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#222222]">New database</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="size-5 text-[#717171]" />
          </button>
        </div>
        {error ? (
          <p className="mb-3 text-[12px] text-[#b91c1c]">{error}</p>
        ) : null}
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[14px] text-[#222222] outline-none focus:border-[#ff4f12]"
        />
        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Description (optional)
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[14px] text-[#222222] outline-none focus:border-[#ff4f12]"
        />
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => void submit()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "#ff4f12" }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Create database
        </button>
        <p className="mt-2 text-center text-[11px] text-[#a0a0a0]">
          A Default table is created automatically.
        </p>
      </div>
    </div>
  )
}

function DatabaseRow({
  db,
  onDelete,
}: {
  db: AppDatabaseSummary
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <li className="flex items-center gap-2">
      <Link
        href={`/database/app-data/${db.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 active:bg-[#fafafa]"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
          style={{ border: "1px solid #e8e8e8" }}
        >
          <Layers2 className="size-4 text-[#ff4f12]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#222222]">{db.name}</p>
          <p className="text-[11px] text-[#a0a0a0]">
            {db.folderCount} table{db.folderCount === 1 ? "" : "s"} · {formatRelativeDate(db.updatedAt)}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-[#c0c0c0]" />
      </Link>
      {confirming ? (
        <div className="flex shrink-0 gap-1 pr-2">
          <button
            type="button"
            onClick={() => onDelete(db.id)}
            className="rounded-lg bg-[#ef4444] px-2 py-1 text-[11px] font-semibold text-white"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg bg-[#f7f7f7] px-2 py-1 text-[11px] font-semibold text-[#717171]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mr-3 shrink-0 p-1 text-[#a0a0a0] active:text-[#ef4444]"
          aria-label={`Delete ${db.name}`}
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </li>
  )
}

export function AppDataListPage() {
  const { connection, ready } = useConnection()
  const [databases, setDatabases] = useState<AppDatabaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [query, setQuery] = useState("")

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!connection) return
      setLoading(true)
      setError(null)
      try {
        setDatabases(await listAppDatabases(connection, signal))
      } catch (err) {
        if (!signal?.aborted) setError(formatApiError(err))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [connection],
  )

  useEffect(() => {
    if (!ready || !connection) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection, load])

  async function handleDelete(id: string) {
    if (!connection) return
    try {
      await deleteAppDatabase(connection, id)
      setDatabases((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  const canWrite =
    connection?.user.role === "OWNER" ||
    connection?.user.role === "ADMIN" ||
    connection?.user.role === "MEMBER"

  const filtered = query.trim()
    ? databases.filter((db) =>
        db.name.toLowerCase().includes(query.toLowerCase()),
      )
    : databases

  return (
    <div className="flex flex-col gap-4">

      {/* ── sticky intro card ───────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-2" style={{ backgroundColor: "#f7f7f7" }}>
        <div
          className="overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(155deg, #ff6a30 0%, #c82d00 100%)" }}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-5">
            <div className="min-w-0 flex-1">
              <p
                className="text-[22px] font-black leading-none tracking-tight text-white"
                style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
              >
                App Data
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                Store and manage structured JSON records for your apps and API clients. Each database has its own tables and access key.
              </p>
              <p className="mt-2 text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                {loading
                  ? "Loading…"
                  : `${databases.length} database${databases.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <Link
              href="/database"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl active:opacity-70"
              style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
              aria-label="Back to Database"
            >
              <ArrowLeft className="size-4 text-white" />
            </Link>
          </div>
        </div>

        {/* ── search + refresh row ───────────────────────────────── */}
        <div className="mt-2 flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <Search className="size-4 shrink-0 text-[#c0c0c0]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search databases…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#222222] outline-none placeholder:text-[#c0c0c0]"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="shrink-0 text-[#c0c0c0] active:text-[#717171]">
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#717171] disabled:opacity-50 active:bg-[#f7f7f7]"
            style={{ border: "1px solid #e5e5e5" }}
            aria-label="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </div>
      ) : null}

      {canWrite ? (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[14px] font-semibold text-white active:opacity-90"
          style={{ backgroundColor: "#ff4f12" }}
        >
          <Plus className="size-4" />
          New database
        </button>
      ) : null}

      <div
        className="overflow-hidden rounded-2xl bg-white"
        style={{ border: "1px solid #e5e5e5" }}
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-7 animate-spin text-[#c0c0c0]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-[13px] text-[#a0a0a0]">
            {query ? `No databases match "${query}".` : "No app data databases yet. Create one to store JSON records for API clients."}
          </p>
        ) : (
          <ul className="divide-y divide-[#f0f0f0]">
            {filtered.map((db) => (
              <DatabaseRow key={db.id} db={db} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>

      {createOpen ? (
        <CreateSheet onClose={() => setCreateOpen(false)} onCreated={() => void load()} />
      ) : null}
    </div>
  )
}
