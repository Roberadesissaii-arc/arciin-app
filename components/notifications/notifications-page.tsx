"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, Clock3, Loader2, RefreshCw, Search, X } from "lucide-react"

import { activityBadgeStyle } from "@/lib/activity/badge-style"
import { activityIconFor, activityTypeLabel } from "@/lib/activity/icons"
import { MobilePagination } from "@/components/ui/mobile-pagination"
import { formatApiError } from "@/lib/api/errors"
import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import { isServerConnected, suppressFetchErrorWhenOffline } from "@/lib/connection/offline-ui"
import {
  countUnreadActivity,
  fetchRecentActivity,
  getNotificationsLastSeen,
  markNotificationsSeen,
} from "@/lib/api/notifications"
import { subscribePublicUrlChanged } from "@/lib/notifications/public-url-changed"
import { useConnection } from "@/components/providers/connection-provider"
import type { ActivitySummary } from "@/lib/types/models"
import { cn } from "@/lib/utils"
import { formatRelativeDate } from "@/lib/utils/format-date"

const PAGE_SIZE = 5

function isUnread(event: ActivitySummary, lastSeenIso: string | null) {
  if (!lastSeenIso) return true
  const lastSeen = Date.parse(lastSeenIso)
  if (Number.isNaN(lastSeen)) return true
  return Date.parse(event.createdAt) > lastSeen
}

/* ── notification row ─────────────────────────────────────────── */

function NotificationRow({
  event,
  unread,
}: {
  event: ActivitySummary
  unread: boolean
}) {
  const Icon = activityIconFor(event)
  const badge = activityBadgeStyle(event)

  return (
    <div
      className={cn(
        "relative flex w-full items-start gap-3.5 px-4 py-4",
        unread && "unread-row-bg",
      )}
    >
      {/* unread left accent */}
      {unread && (
        <span className="unread-row-accent absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full" />
      )}

      {/* icon — original gray style */}
      <div
        className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#f7f7f7]"
        style={{ border: "1px solid #e8e8e8" }}
      >
        <Icon className="size-[15px] text-[#717171]" />
      </div>

      {/* text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-[13px] leading-snug"
            style={{ fontWeight: unread ? 700 : 600, color: "#222222" }}
          >
            {event.title}
          </p>
          <span className="shrink-0 text-[11px] text-[#a0a0a0]">
            {formatRelativeDate(event.createdAt)}
          </span>
        </div>

        {/* colored type badge */}
        <span
          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: badge.bg, color: badge.color }}
        >
          {activityTypeLabel(event.type)}
        </span>

        {event.message ? (
          <p className="mt-1.5 text-[12px] leading-relaxed text-[#717171]">
            {event.message}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/* ── main page ────────────────────────────────────────────────── */

export function NotificationsPage() {
  const { connection, ready, serverReachable } = useConnection()
  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const serverReachableRef = useRef(serverReachable)
  serverReachableRef.current = serverReachable

  const [items, setItems] = useState<ActivitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState("")
  const markedSeenRef = useRef(false)

  const load = useCallback(async (signal?: AbortSignal, background = false) => {
    const conn = connectionRef.current
    const reachable = serverReachableRef.current
    if (!conn) return
    if (background) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const activity = await fetchRecentActivity(conn, signal)
      setItems(activity)
      setPage(0)
    } catch (err) {
      if (!signal?.aborted) {
        setError(suppressFetchErrorWhenOffline(reachable, formatApiError(err)))
      }
    } finally {
      if (!signal?.aborted) {
        if (background) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    }
  }, [])

  useEffect(() => { setLastSeen(getNotificationsLastSeen()) }, [])

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

  useEffect(() => {
    if (!ready || !connection || !isServerConnected(serverReachable)) return
    return subscribePublicUrlChanged(() => {
      void load(undefined, true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, connection?.sessionToken, serverReachable])

  useEffect(() => {
    if (loading || error || markedSeenRef.current) return
    markedSeenRef.current = true
    const iso = new Date().toISOString()
    markNotificationsSeen(iso)
    setLastSeen(iso)
  }, [loading, error])

  const unread = countUnreadActivity(items, lastSeen)
  const filtered = query.trim()
    ? items.filter((e) => e.title.toLowerCase().includes(query.toLowerCase()) || e.type.toLowerCase().includes(query.toLowerCase()))
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
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              <p
                className="text-[22px] font-black leading-none tracking-tight text-white"
                style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
              >
                Notifications
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                Stay up to date with everything happening on your Arciin instance — uploads, library changes, and system events.
              </p>
              <p className="mt-2 text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                {loading
                  ? "Loading activity…"
                  : refreshing
                    ? "Updating…"
                    : unread > 0
                      ? `${unread} unread notification${unread === 1 ? "" : "s"}`
                      : "You're all caught up"}
              </p>
            </div>
            {unread > 0 && !loading ? (
              <button
                type="button"
                onClick={() => { markNotificationsSeen(); setLastSeen(new Date().toISOString()) }}
                className="shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white active:opacity-70"
                style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
              >
                Mark read
              </button>
            ) : null}
          </div>

          {!loading && items.length > 0 && (
            <div className="flex items-center gap-1.5 px-5 pb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
              <Clock3 className="size-3" />
              <span className="text-[11px]">
                {items.length} event{items.length === 1 ? "" : "s"} total
              </span>
            </div>
          )}
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
              placeholder="Search notifications…"
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
            onClick={() => void load(undefined, Boolean(items.length))}
            disabled={loading && !items.length}
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#717171] disabled:opacity-50 active:bg-[#f7f7f7]"
            style={{ border: "1px solid #e5e5e5" }}
            aria-label="Refresh"
          >
            <RefreshCw className={`size-4 ${loading || refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <PageFetchErrorAlert error={error} onRetry={() => void load()} />

      {/* ── list ────────────────────────────────────────────────── */}
      {loading && items.length === 0 ? (
        <div className="flex justify-center py-14">
          <Loader2 className="size-7 animate-spin text-[#c0c0c0]" />
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white py-14"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <div className="empty-state-icon flex size-14 items-center justify-center rounded-2xl">
            <Bell className="text-accent size-6" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#222222]">No notifications yet</p>
            <p className="mt-0.5 text-[12px] text-[#a0a0a0]">
              Activity from your instance will appear here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="overflow-hidden rounded-2xl bg-white"
            style={{ border: "1px solid #e5e5e5" }}
          >
            {pageItems.map((event, i) => (
              <div key={event.id}>
                {i > 0 ? <div className="mx-4 h-px bg-[#f5f5f5]" /> : null}
                <NotificationRow event={event} unread={isUnread(event, lastSeen)} />
              </div>
            ))}
          </div>

          <MobilePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
