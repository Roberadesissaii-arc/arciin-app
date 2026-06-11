"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Activity, Loader2, RefreshCw, Search, X } from "lucide-react"

import { activityBadgeStyle } from "@/lib/activity/badge-style"
import { activityIconFor, activityTypeLabel, Clock3 } from "@/lib/activity/icons"
import { MobilePagination } from "@/components/ui/mobile-pagination"
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
      <div
        className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pb-2"
        style={{ backgroundColor: "#f7f7f7", paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="page-intro-hero overflow-hidden rounded-3xl">
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
          <div className="empty-state-icon flex size-14 items-center justify-center rounded-2xl">
            <Activity className="text-accent size-6" />
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
              const badge = activityBadgeStyle(event)
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

          <MobilePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
