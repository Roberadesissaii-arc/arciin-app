"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, Loader2 } from "lucide-react"

import { activityIconFor, activityTypeLabel } from "@/lib/activity/icons"
import { formatApiError } from "@/lib/api/errors"
import {
  countUnreadActivity,
  fetchRecentActivity,
  getNotificationsLastSeen,
  markNotificationsSeen,
} from "@/lib/api/notifications"
import { useConnection } from "@/components/providers/connection-provider"
import type { ActivitySummary } from "@/lib/types/models"
import { formatRelativeDate } from "@/lib/utils/format-date"

function isUnread(event: ActivitySummary, lastSeenIso: string | null) {
  if (!lastSeenIso) return true
  const lastSeen = Date.parse(lastSeenIso)
  if (Number.isNaN(lastSeen)) return true
  return Date.parse(event.createdAt) > lastSeen
}

export function NotificationsPage() {
  const { connection, ready } = useConnection()
  const [items, setItems] = useState<ActivitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSeen, setLastSeen] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!connection) return
    setLoading(true)
    setError(null)
    try {
      const activity = await fetchRecentActivity(connection, signal)
      setItems(activity)
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [connection])

  useEffect(() => {
    setLastSeen(getNotificationsLastSeen())
  }, [])

  useEffect(() => {
    if (!ready || !connection) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection, load])

  useEffect(() => {
    if (!loading && !error) {
      markNotificationsSeen()
      setLastSeen(new Date().toISOString())
    }
  }, [loading, error])

  const unread = countUnreadActivity(items, lastSeen)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-[22px] font-bold tracking-tight text-[#222222]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            Notifications
          </h2>
          <p className="mt-0.5 text-[13px] text-[#717171]">
            {loading ? "Loading…" : unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && !loading ? (
          <button
            type="button"
            onClick={() => {
              markNotificationsSeen()
              setLastSeen(new Date().toISOString())
            }}
            className="rounded-xl px-3 py-1.5 text-[12px] font-semibold text-[#ff4f12] transition-colors active:bg-[#fff4f0]"
            style={{ border: "1px solid rgba(255,79,18,0.25)" }}
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-14">
          <Loader2 className="size-7 animate-spin text-[#c0c0c0]" />
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white py-14"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <div
            className="flex size-14 items-center justify-center rounded-2xl bg-[#f7f7f7]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <Bell className="size-6 text-[#c0c0c0]" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#222222]">No notifications</p>
            <p className="mt-0.5 text-[12px] text-[#a0a0a0]">
              Activity from your instance will show up here.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl bg-white"
          style={{ border: "1px solid #e5e5e5" }}
        >
          {items.map((event, i) => {
            const Icon = activityIconFor(event)
            const unreadItem = isUnread(event, lastSeen)
            return (
              <div key={event.id}>
                {i > 0 ? <div className="mx-4 h-px bg-[#f0f0f0]" /> : null}
                <div
                  className="flex w-full items-start gap-3 px-4 py-4 text-left"
                  style={{
                    backgroundColor: unreadItem ? "rgba(255,79,18,0.025)" : "transparent",
                  }}
                >
                  <div
                    className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
                    style={{ border: "1px solid #e8e8e8" }}
                  >
                    <Icon className="size-[15px] text-[#717171]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#222222]">{event.title}</p>
                      {unreadItem ? (
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: "#ff4f12" }}
                        />
                      ) : null}
                    </div>
                    <p className="text-[11px] font-medium text-[#a0a0a0]">
                      {activityTypeLabel(event.type)}
                    </p>
                    {event.message ? (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[#717171]">
                        {event.message}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-[#a0a0a0]">
                      {formatRelativeDate(event.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
