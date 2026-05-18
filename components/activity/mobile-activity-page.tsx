"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { activityIconFor, activityTypeLabel, Clock3 } from "@/lib/activity/icons"
import { formatApiError } from "@/lib/api/errors"
import { fetchRecentActivity } from "@/lib/api/notifications"
import { useConnection } from "@/components/providers/connection-provider"
import type { ActivitySummary } from "@/lib/types/models"
import { formatRelativeDate } from "@/lib/utils/format-date"

export function MobileActivityPage({ title = "Activity" }: { title?: string }) {
  const { connection, ready } = useConnection()
  const [items, setItems] = useState<ActivitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!connection) return
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchRecentActivity(connection, signal))
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [connection])

  useEffect(() => {
    if (!ready || !connection) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection, load])

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2
          className="text-[22px] font-bold tracking-tight text-[#222222]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          {title}
        </h2>
        <p className="mt-0.5 text-[13px] text-[#717171]">
          {loading ? "Loading…" : `${items.length} events in the feed`}
        </p>
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
        className="overflow-hidden rounded-2xl bg-white"
        style={{ border: "1px solid #e5e5e5" }}
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-7 animate-spin text-[#c0c0c0]" />
          </div>
        ) : items.length ? (
          <ul className="divide-y divide-[#f0f0f0]">
            {items.map((event) => {
              const Icon = activityIconFor(event)
              return (
                <li key={event.id} className="flex items-start gap-3 px-4 py-3.5">
                  <div
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
                    style={{ border: "1px solid #e8e8e8" }}
                  >
                    <Icon className="size-3.5 text-[#717171]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#222222]">{event.title}</p>
                    <p className="text-[11px] font-medium text-[#a0a0a0]">
                      {activityTypeLabel(event.type)}
                    </p>
                    {event.message ? (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[#717171]">
                        {event.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#a0a0a0]">
                    <Clock3 className="size-3 shrink-0" />
                    {formatRelativeDate(event.createdAt)}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-12 text-center text-[13px] text-[#a0a0a0]">No events yet</p>
        )}
      </div>
    </div>
  )
}
