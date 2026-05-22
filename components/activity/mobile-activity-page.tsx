"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Activity, Loader2, RefreshCw, Search, X } from "lucide-react"

import { activityIconFor, activityTypeLabel, Clock3 } from "@/lib/activity/icons"
import { formatApiError } from "@/lib/api/errors"
import { fetchRecentActivity } from "@/lib/api/notifications"
import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import { useConnection } from "@/components/providers/connection-provider"
import {
  isServerConnected,
  suppressFetchErrorWhenOffline,
} from "@/lib/connection/offline-ui"
import type { ActivitySummary } from "@/lib/types/models"
import { formatRelativeDate } from "@/lib/utils/format-date"

const PAGE_SIZE = 5

const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  upload:    { bg: "#dcfce7", color: "#16a34a" },
  asset:     { bg: "#fff4f0", color: "#ff4f12" },
  folder:    { bg: "#eff6ff", color: "#2563eb" },
  library:   { bg: "#f5f3ff", color: "#7c3aed" },
  "api-key": { bg: "#fffbeb", color: "#d97706" },
}

function badgeStyleFor(event: ActivitySummary) {
  const key = event.entityType ?? event.type.split(".")[0] ?? ""
  return BADGE_STYLE[key] ?? { bg: "#f7f7f7", color: "#717171" }
}

export function MobileActivityPage({ title = "Activity" }: { title?: string }) {
  const { connection, ready, serverReachable } = useConnection()
  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const serverReachableRef = useRef(serverReachable)
  serverReachableRef.current = serverReachable

  const [items, setItems] = useState<ActivitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)

  const load = useCallback(async (signal?: AbortSignal) => {
    const conn = connectionRef.current
    const reachable = serverReachableRef.current
    if (!conn) return
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchRecentActivity(conn, signal))
      setPage(0)
    } catch (err) {
      if (!signal?.aborted) {
        setError(suppressFetchErrorWhenOffline(reachable, formatApiError(err)))
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (serverReachable === false) {
      setError(null)
      setLoading(false)
    }
  }, [serverReachable])

  useEffect(() => {
    if (!ready || !connection || !isServerConnected(serverReachable)) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, connection?.sessionToken, serverReachable])

  const filtered = query.trim()
    ? items.filter((e) =>
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.type.toLowerCase().includes(query.toLowerCase()),
      )
    : items
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">

      {/* ── sticky intro card ───────────────────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-2" style={{ backgroundColor: "#f7f7f7" }}>
        <div
          className="overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(155deg, #ff6a30 0%, #c82d00 100%)" }}
        >
          <div className="px-5 pt-5 pb-5">
            <p
              className="text-[22px] font-black leading-none tracking-tight text-white"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
            >
              {title}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              A timeline of everything happening on your Arciin instance — uploads, library changes, jobs, and system events.
            </p>
            <p className="mt-2 text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
              {loading
                ? "Loading…"
                : `${items.length} event${items.length === 1 ? "" : "s"} in timeline`}
            </p>
          </div>
        </div>

        {/* search + refresh */}
        <div className="mt-2 flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <Search className="size-4 shrink-0 text-[#c0c0c0]" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0) }}
              placeholder="Search activity…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#222222] outline-none placeholder:text-[#c0c0c0]"
            />
            {query ? (
              <button type="button" onClick={() => { setQuery(""); setPage(0) }} className="shrink-0 text-[#c0c0c0] active:text-[#717171]">
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

      {/* ── error ───────────────────────────────────────────────── */}
      <PageFetchErrorAlert error={error} onRetry={() => void load()} />

      {/* ── list ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-7 animate-spin text-[#c0c0c0]" />
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl bg-white py-14"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <div
            className="flex size-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "#fff4f0", border: "1px solid rgba(255,79,18,0.15)" }}
          >
            <Activity className="size-6 text-[#ff4f12]" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#222222]">No activity yet</p>
            <p className="mt-0.5 text-[12px] text-[#a0a0a0]">
              Events from your instance will appear here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="overflow-hidden rounded-2xl bg-white"
            style={{ border: "1px solid #e5e5e5" }}
          >
            {pageItems.map((event, i) => {
              const Icon = activityIconFor(event)
              const badge = badgeStyleFor(event)
              return (
                <div key={event.id}>
                  {i > 0 ? <div className="mx-4 h-px bg-[#f5f5f5]" /> : null}
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <div
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
                      style={{ border: "1px solid #e8e8e8" }}
                    >
                      <Icon className="size-[15px] text-[#717171]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[#222222]">{event.title}</p>
                        <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#a0a0a0]">
                          <Clock3 className="size-3 shrink-0" />
                          {formatRelativeDate(event.createdAt)}
                        </span>
                      </div>
                      <span
                        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: badge.bg, color: badge.color }}
                      >
                        {activityTypeLabel(event.type)}
                      </span>
                      {event.message ? (
                        <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
                          {event.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── pagination ────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3" style={{ border: "1px solid #e5e5e5" }}>
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="flex size-9 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#717171] transition-opacity disabled:opacity-30 active:bg-[#efefef]"
                style={{ border: "1px solid #e5e5e5" }}
                aria-label="Previous page"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    style={{
                      width: page === i ? 20 : 8,
                      height: 8,
                      borderRadius: 99,
                      transition: "width 0.2s, background-color 0.2s",
                      backgroundColor: page === i ? "#ff4f12" : "#e0e0e0",
                    }}
                    aria-label={`Page ${i + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={page === totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="flex size-9 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#717171] transition-opacity disabled:opacity-30 active:bg-[#efefef]"
                style={{ border: "1px solid #e5e5e5" }}
                aria-label="Next page"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
