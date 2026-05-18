"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { fetchAdminTableData, fetchAdminTables } from "@/lib/api/admin"
import { formatApiError } from "@/lib/api/errors"
import { formatColumnLabel, TableCell } from "@/lib/database/table-cell"
import { tableIconFor } from "@/lib/database/table-icons"
import type { AdminTable, AdminTableData } from "@/lib/types/database"

const PRIMARY_FIELDS = ["name", "email", "title", "originalFilename", "slug", "id"]

const CARD_STYLE = {
  border: "1px solid #e5e5e5",
  boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
  backgroundColor: "#fafafa",
} as const

function pickPrimaryField(columns: string[], row: Record<string, unknown>) {
  for (const key of PRIMARY_FIELDS) {
    if (columns.includes(key) && row[key] != null && row[key] !== "") {
      return key
    }
  }
  return columns[0]
}

function pickSubtitle(columns: string[], row: Record<string, unknown>, primaryKey: string) {
  const candidates = ["email", "slug", "role", "mimeType", "status"]
  for (const key of candidates) {
    if (key !== primaryKey && columns.includes(key) && row[key] != null && row[key] !== "") {
      return { key, value: row[key] }
    }
  }
  return null
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div
      className="flex flex-col gap-1 border-b border-[#ececec] py-3 last:border-b-0"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
        {label}
      </span>
      <div className="break-words text-[14px] leading-snug text-[#222222]">
        <TableCell value={value} />
      </div>
    </div>
  )
}

function SoloRecordDetail({
  row,
  columns,
  meta,
  data,
}: {
  row: Record<string, unknown>
  columns: string[]
  meta: AdminTable
  data: AdminTableData
}) {
  const primaryKey = pickPrimaryField(columns, row)
  const subtitle = pickSubtitle(columns, row, primaryKey)
  const detailColumns = columns.filter((c) => c !== primaryKey && c !== subtitle?.key)

  return (
    <section
      className="flex min-h-[min(520px,calc(100dvh-11rem))] flex-col overflow-hidden rounded-2xl"
      style={{ ...CARD_STYLE, borderLeft: "4px solid #ff4f12" }}
    >
      <div
        className="border-b border-[#ececec] px-5 py-5"
        style={{ background: "linear-gradient(165deg, #fff7f4 0%, #fafafa 100%)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ff4f12]">
          {meta.label}
        </p>
        <h2
          className="mt-2 text-[26px] font-bold leading-tight text-[#222222]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          <TableCell value={row[primaryKey]} />
        </h2>
        {subtitle ? (
          <p className="mt-2 text-[14px] text-[#717171]">
            <TableCell value={subtitle.value} />
          </p>
        ) : null}
        <p className="mt-4 text-[11px] text-[#a0a0a0]">
          {data.total.toLocaleString()} row{data.total === 1 ? "" : "s"} in PostgreSQL · read-only
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-2">
        {detailColumns.map((col) => (
          <FieldRow key={col} label={formatColumnLabel(col)} value={row[col]} />
        ))}
      </div>
    </section>
  )
}

function RecordCard({
  row,
  rowIndex,
  page,
  pageSize,
  columns,
}: {
  row: Record<string, unknown>
  rowIndex: number
  page: number
  pageSize: number
  columns: string[]
}) {
  const primaryKey = pickPrimaryField(columns, row)
  const subtitle = pickSubtitle(columns, row, primaryKey)
  const otherColumns = columns.filter((c) => c !== primaryKey && c !== subtitle?.key)
  const rowLabel = (page - 1) * pageSize + rowIndex + 1

  return (
    <article
      className="overflow-hidden rounded-2xl"
      style={{ ...CARD_STYLE, borderLeft: "3px solid #ff4f12" }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#ececec] px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff4f12]">
          #{rowLabel}
        </span>
        {columns.includes("id") && row.id != null ? (
          <span className="max-w-[50%] truncate font-mono text-[10px] text-[#a0a0a0]">
            {String(row.id).slice(0, 18)}
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <p className="text-[15px] font-semibold leading-snug text-[#222222]">
          <TableCell value={row[primaryKey]} />
        </p>
        {subtitle ? (
          <p className="mt-1 text-[12px] text-[#717171]">
            <TableCell value={subtitle.value} />
          </p>
        ) : null}

        {otherColumns.length > 0 ? (
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {otherColumns.slice(0, 8).map((col) => (
              <div key={col} className="min-w-0 rounded-lg bg-white/80 px-2.5 py-2">
                <dt className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                  {formatColumnLabel(col)}
                </dt>
                <dd className="mt-1 break-words">
                  <TableCell value={row[col]} />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {otherColumns.length > 8 ? (
          <p className="mt-2 text-[11px] text-[#a0a0a0]">
            +{otherColumns.length - 8} more fields
          </p>
        ) : null}
      </div>
    </article>
  )
}

function RecordsSkeleton({ solo }: { solo?: boolean }) {
  return (
    <article
      className={`animate-pulse overflow-hidden rounded-2xl ${solo ? "min-h-[min(420px,55vh)]" : ""}`}
      style={{ ...CARD_STYLE, borderLeft: "4px solid #ececec" }}
    >
      <div className="h-24 bg-[#f0f0f0]" />
      <div className="space-y-3 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-[#f0f0f0]" />
        ))}
      </div>
    </article>
  )
}

function TableHero({
  meta,
  data,
  tableName,
  page,
  totalPages,
  compact,
}: {
  meta: AdminTable
  data: AdminTableData | null
  tableName: string
  page: number
  totalPages: number
  compact?: boolean
}) {
  const Icon = tableIconFor(tableName)

  return (
    <section
      className={`rounded-2xl ${compact ? "p-4" : "p-5"}`}
      style={CARD_STYLE}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(145deg, rgba(255,79,18,0.15) 0%, rgba(255,79,18,0.04) 100%)",
            border: "1px solid rgba(255,79,18,0.2)",
          }}
        >
          <Icon className="size-5 text-[#ff4f12]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h1
            className="text-[18px] font-bold leading-tight text-[#222222]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            {meta.label}
          </h1>
          {!compact ? (
            <p className="mt-1.5 text-[12px] leading-relaxed text-[#717171]">{meta.description}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/70 px-2 py-2 text-center" style={{ border: "1px solid #ececec" }}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0a0]">Rows</p>
          <p className="mt-0.5 text-[14px] font-bold tabular-nums text-[#222222]">
            {data?.total.toLocaleString() ?? "—"}
          </p>
        </div>
        <div className="rounded-xl bg-white/70 px-2 py-2 text-center" style={{ border: "1px solid #ececec" }}>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#a0a0a0]">On page</p>
          <p className="mt-0.5 text-[14px] font-bold tabular-nums text-[#222222]">
            {data?.rows.length ?? 0}
          </p>
        </div>
        <div
          className="rounded-xl px-2 py-2 text-center"
          style={{ backgroundColor: "#fff7f4", border: "1px solid rgba(255,79,18,0.18)" }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#ff4f12]/80">Page</p>
          <p className="mt-0.5 text-[14px] font-bold tabular-nums text-[#ff4f12]">
            {totalPages > 1 ? `${page}/${totalPages}` : "1"}
          </p>
        </div>
      </div>
    </section>
  )
}

function PaginationBar({
  page,
  totalPages,
  loading,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  loading: boolean
  onPrev: () => void
  onNext: () => void
}) {
  if (totalPages <= 1) return null

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3"
      style={CARD_STYLE}
    >
      <button
        type="button"
        disabled={page <= 1 || loading}
        onClick={onPrev}
        className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white/80 py-2.5 text-[13px] font-semibold text-[#222222] active:bg-[#f0f0f0] disabled:opacity-40"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <ChevronLeft className="size-4" />
        Previous
      </button>
      <span className="shrink-0 px-1 text-[12px] font-medium tabular-nums text-[#717171]">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages || loading}
        onClick={onNext}
        className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white/80 py-2.5 text-[13px] font-semibold text-[#222222] active:bg-[#f0f0f0] disabled:opacity-40"
        style={{ border: "1px solid #e5e5e5" }}
      >
        Next
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}

export function DatabaseTablePage({ tableName }: { tableName: string }) {
  const { connection, ready } = useConnection()
  const [meta, setMeta] = useState<AdminTable | null>(null)
  const [data, setData] = useState<AdminTableData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal, isRefresh = false) => {
      if (!connection) return
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const [tables, tableData] = await Promise.all([
          fetchAdminTables(connection, signal),
          fetchAdminTableData(connection, tableName, page, signal),
        ])
        if (signal?.aborted) return
        setMeta(tables.find((t) => t.name === tableName) ?? null)
        setData(tableData)
      } catch (err) {
        if (!signal?.aborted) setError(formatApiError(err))
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [connection, tableName, page],
  )

  useEffect(() => {
    if (!ready || !connection) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection, load])

  const columns = useMemo(
    () => (data?.rows[0] ? Object.keys(data.rows[0]) : []),
    [data?.rows],
  )
  const totalPages = data?.totalPages ?? 1
  const pageSize = data?.limit ?? 20
  const soloRow = (data?.rows.length ?? 0) === 1 && page === 1

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-2">
      <div className="flex items-center gap-2">
        <Link
          href="/database"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#717171] active:opacity-70"
          style={CARD_STYLE}
          aria-label="Back to database"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => void load(undefined, true)}
          disabled={loading && !data}
          className="ml-auto flex size-9 items-center justify-center rounded-xl text-[#717171] disabled:opacity-40"
          style={CARD_STYLE}
          aria-label="Refresh"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
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

      {loading && !data?.rows.length ? (
        <RecordsSkeleton solo={soloRow} />
      ) : !data?.rows.length ? (
        <div
          className="flex min-h-[min(360px,50vh)] flex-col items-center justify-center rounded-2xl px-6"
          style={CARD_STYLE}
        >
          <Database className="mb-3 size-10 text-[#d4d4d4]" />
          <p className="text-[15px] font-semibold text-[#222222]">No rows yet</p>
          <p className="mt-1 text-center text-[13px] text-[#a0a0a0]">
            This table exists but has no records.
          </p>
        </div>
      ) : soloRow && meta && data.rows[0] ? (
        <SoloRecordDetail row={data.rows[0]} columns={columns} meta={meta} data={data} />
      ) : (
        <>
          {meta ? (
            <TableHero
              meta={meta}
              data={data}
              tableName={tableName}
              page={page}
              totalPages={totalPages}
              compact={(data?.rows.length ?? 0) > 3}
            />
          ) : null}

          <div className={`flex flex-col gap-2.5 ${refreshing ? "opacity-70" : ""}`}>
            {data?.rows.map((row, index) => (
              <RecordCard
                key={String(row.id ?? index)}
                row={row}
                rowIndex={index}
                page={page}
                pageSize={pageSize}
                columns={columns}
              />
            ))}
          </div>
        </>
      )}

      <PaginationBar
        page={page}
        totalPages={totalPages}
        loading={loading}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    </div>
  )
}
