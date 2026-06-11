"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ChevronRight,
  Database,
  Layers2,
  RefreshCw,
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { fetchAdminTables } from "@/lib/api/admin"
import { formatApiError } from "@/lib/api/errors"
import { fetchHealth } from "@/lib/api/health"
import { listAppDatabases } from "@/lib/api/app-databases"
import { tableIconFor } from "@/lib/database/table-icons"
import type { AdminTable, HealthStatus } from "@/lib/types/database"
import {
  mobilePageSubtitleClass,
  mobilePageTitleClass,
  mobilePageTitleStyle,
} from "@/lib/ui/mobile-page-header"

function StatPillSkeleton() {
  return (
    <div
      className="flex flex-col rounded-xl bg-white px-3 py-2.5"
      style={{ border: "1px solid #e5e5e5" }}
    >
      <div className="h-2.5 w-12 animate-pulse rounded bg-[#ececec]" />
      <div className="mt-2 h-5 w-14 animate-pulse rounded-md bg-[#e8e8e8]" />
    </div>
  )
}

function StatPill({
  label,
  value,
  pulsing,
}: {
  label: string
  value: string
  pulsing?: boolean
}) {
  return (
    <div
      className={`flex flex-col rounded-xl bg-white px-3 py-2.5 transition-opacity ${pulsing ? "opacity-50" : ""}`}
      style={{ border: "1px solid #e5e5e5" }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">{label}</span>
      <span className="mt-0.5 text-[15px] font-bold tabular-nums text-[#222222]">{value}</span>
    </div>
  )
}

function TableCardSkeleton() {
  return (
    <div
      className="flex animate-pulse flex-col overflow-hidden rounded-2xl bg-white"
      style={{ border: "1px solid #e5e5e5", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="size-12 rounded-2xl bg-[#ececec]" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="h-4 w-28 rounded-md bg-[#ececec]" />
          <div className="h-2.5 w-16 rounded bg-[#f0f0f0]" />
        </div>
      </div>
      <div className="mx-4 h-2.5 rounded bg-[#f5f5f5]" />
      <div className="mt-3 px-4 py-3">
        <div className="h-4 w-14 animate-pulse rounded bg-[#ececec]" />
      </div>
    </div>
  )
}

function SchemaTableCard({ table }: { table: AdminTable }) {
  const Icon = tableIconFor(table.name)

  return (
    <Link
      href={`/database/${table.name}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white active:scale-[0.985] active:opacity-95"
      style={{
        border: "1px solid #e5e5e5",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-start gap-3 p-4 pb-2">
        <div
          className="page-intro-hero flex size-12 shrink-0 items-center justify-center rounded-2xl"
          style={{ boxShadow: "0 4px 14px var(--arciin-accent-ring, rgba(255, 79, 18, 0.28))" }}
        >
          <Icon className="size-5 text-white" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-[15px] font-bold leading-tight tracking-tight text-[#222222]"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
            >
              {table.label}
            </p>
            <ChevronRight className="text-accent mt-0.5 size-4 shrink-0 opacity-40 transition-all group-active:translate-x-0.5 group-active:opacity-100" />
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] text-[#a0a0a0]">{table.name}</p>
        </div>
      </div>

      <p className="line-clamp-2 px-4 pb-3 text-[11px] leading-relaxed text-[#717171]">
        {table.description}
      </p>

      <div className="page-intro-hero flex items-center justify-between px-4 py-2.5">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          Rows
        </span>
        <span className="text-[14px] font-bold tabular-nums text-white">
          {table.count.toLocaleString()}
        </span>
      </div>
    </Link>
  )
}

export function DatabasePage() {
  const { connection, ready } = useConnection()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [tables, setTables] = useState<AdminTable[]>([])
  const [appDbCount, setAppDbCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminDenied, setAdminDenied] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal, isRefresh = false) => {
      if (!connection) return
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      if (!isRefresh) setAdminDenied(false)

      try {
        const [healthResult, appDbs] = await Promise.all([
          fetchHealth(connection, signal),
          listAppDatabases(connection, signal).catch(() => []),
        ])
        if (signal?.aborted) return
        setHealth(healthResult)
        setAppDbCount(appDbs.length)

        try {
          const tableList = await fetchAdminTables(connection, signal)
          if (!signal?.aborted) setTables(tableList)
        } catch (err) {
          if (signal?.aborted) return
          const msg = formatApiError(err)
          if (msg.toLowerCase().includes("forbidden") || msg.toLowerCase().includes("admin")) {
            setAdminDenied(true)
            if (!isRefresh) setTables([])
          } else {
            throw err
          }
        }
      } catch (err) {
        if (!signal?.aborted) setError(formatApiError(err))
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
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

  const dbOnline = health?.database === "online"
  const totalRows = useMemo(() => tables.reduce((s, t) => s + t.count, 0), [tables])
  const statsPending = loading && !health
  const showStats = statsPending || Boolean(health)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={mobilePageTitleClass} style={mobilePageTitleStyle}>
            Database
          </h2>
          <p className={mobilePageSubtitleClass}>PostgreSQL · Prisma · live record counts</p>
        </div>
        <button
          type="button"
          onClick={() => void load(undefined, true)}
          disabled={loading && !health}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#717171] active:opacity-70 disabled:opacity-40"
          style={{ border: "1px solid #e5e5e5" }}
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

      <div
        className="flex items-center gap-3 rounded-2xl bg-white p-4"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div
          className="flex size-9 items-center justify-center rounded-xl bg-[#f7f7f7]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <Database className="size-[18px] text-[#717171]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">PostgreSQL</p>
          <p className="text-[11px] text-[#a0a0a0]">
            {statsPending ? "Checking…" : dbOnline ? "Connected" : "Offline or unreachable"}
          </p>
        </div>
        <span
          className={`size-2.5 rounded-full ${
            statsPending
              ? "animate-pulse bg-[#a0a0a0]"
              : dbOnline
                ? "bg-[#22c55e] shadow-[0_0_0_3px_rgba(34,197,94,0.25)]"
                : "bg-[#ef4444]"
          }`}
          aria-hidden
        />
      </div>

      {showStats ? (
        <div className="grid grid-cols-2 gap-2">
          {statsPending ? (
            <>
              <StatPillSkeleton />
              <StatPillSkeleton />
              <StatPillSkeleton />
              <StatPillSkeleton />
            </>
          ) : (
            <>
              <StatPill
                label="Tables"
                value={adminDenied ? "—" : String(tables.length)}
                pulsing={refreshing}
              />
              <StatPill
                label="Total rows"
                value={adminDenied ? "—" : totalRows.toLocaleString()}
                pulsing={refreshing}
              />
              <StatPill
                label="Redis"
                value={health!.redis === "online" ? "Online" : "Offline"}
                pulsing={refreshing}
              />
              <StatPill
                label="Worker"
                value={health!.worker}
                pulsing={refreshing}
              />
            </>
          )}
        </div>
      ) : null}

      <div>
        <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          App data
        </p>
        <Link
          href="/database/app-data"
          className="accent-link-card flex items-center gap-3 rounded-2xl p-4 active:opacity-80"
        >
          <div className="accent-icon-tile flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Layers2 className="text-accent size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#222222]">App data databases</p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#717171]">
              Logical JSON stores for API clients — folders and records in Postgres.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {appDbCount !== null ? (
              <span className="rounded-lg bg-[#f7f7f7] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#222222]">
                {appDbCount}
              </span>
            ) : null}
            <ArrowRight className="text-accent size-4" />
          </div>
        </Link>
      </div>

      <div>
        <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          Schema tables
        </p>
        <p className="mb-3 ml-1 text-[11px] leading-relaxed text-[#a0a0a0]">
          Tap a table to browse live PostgreSQL rows.
        </p>
        {loading && tables.length === 0 && !adminDenied ? (
          <div className="grid gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <TableCardSkeleton key={i} />
            ))}
          </div>
        ) : adminDenied ? (
          <div
            className="rounded-2xl bg-white px-4 py-10 text-center"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <p className="text-[13px] font-medium text-[#222222]">Admin access required</p>
            <p className="mt-1 text-[12px] text-[#717171]">
              Schema browsing is limited to Owner and Admin roles. You can still use App data databases above.
            </p>
          </div>
        ) : tables.length === 0 ? (
          <div
            className="rounded-2xl bg-white px-4 py-10 text-center text-[13px] text-[#a0a0a0]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            No tables found
          </div>
        ) : (
          <div className={`grid gap-3 ${refreshing ? "opacity-70" : ""}`}>
            {tables.map((table) => (
              <SchemaTableCard key={table.name} table={table} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
