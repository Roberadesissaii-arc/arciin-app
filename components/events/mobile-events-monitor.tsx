"use client"

import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { ChevronDown, ChevronRight, Pause, Play, Trash2, Wifi, WifiOff } from "lucide-react"

import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import { useConnection } from "@/components/providers/connection-provider"
import { getMobileSocketUrl } from "@/lib/realtime/socket-url"
import { socketEventTypes, type SocketEventPayload } from "@/lib/types/events"
import { cn } from "@/lib/utils"

const MAX_EVENTS = 300

type LiveEvent = SocketEventPayload & { _rxAt: string; _uid: string }

const CAT_STYLE: Record<string, string> = {
  upload: "bg-blue-50 border-blue-200 text-blue-800",
  asset: "bg-violet-50 border-violet-200 text-violet-800",
  thumbnail: "bg-orange-50 border-orange-200 text-orange-800",
  media: "bg-orange-50 border-orange-200 text-orange-800",
  library: "bg-emerald-50 border-emerald-200 text-emerald-800",
  job: "bg-amber-50 border-amber-200 text-amber-800",
  activity: "bg-[#f7f7f7] border-[#e5e5e5] text-[#717171]",
  plex: "bg-yellow-50 border-yellow-200 text-yellow-800",
}

const DOT_STYLE: Record<string, string> = {
  upload: "bg-blue-500",
  asset: "bg-violet-500",
  thumbnail: "bg-[#ff4f12]",
  media: "bg-[#ff4f12]",
  library: "bg-emerald-500",
  job: "bg-amber-500",
  activity: "bg-zinc-400",
  plex: "bg-yellow-500",
}

const CATEGORIES = ["all", "upload", "asset", "media", "library", "job", "activity", "plex"] as const

function cat(type: string) {
  return type.split(".")[0] ?? "activity"
}

function catStyle(type: string) {
  return CAT_STYLE[cat(type)] ?? "bg-[#f7f7f7] border-[#e5e5e5] text-[#717171]"
}

function dotStyle(type: string) {
  return DOT_STYLE[cat(type)] ?? "bg-zinc-400"
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 1000) return "just now"
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return new Date(iso).toLocaleTimeString()
}

function EventCard({ event }: { event: LiveEvent }) {
  const [open, setOpen] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _rxAt, _uid: _uid_, ...payload } = event
  const hasExtra = Object.keys(payload).some(
    (k) =>
      !["id", "type", "createdAt", "message"].includes(k) &&
      payload[k as keyof typeof payload] != null,
  )

  return (
    <div
      className="overflow-hidden rounded-xl bg-white"
      style={{ border: "1px solid #e5e5e5" }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
        onClick={() => hasExtra && setOpen((o) => !o)}
      >
        <span className={cn("size-2 shrink-0 rounded-full", dotStyle(event.type))} />
        <span
          className={cn(
            "shrink-0 rounded-lg border px-1.5 py-0.5 font-mono text-[10px] font-bold",
            catStyle(event.type),
          )}
        >
          {event.type}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-[#222222]">
          {event.message ?? event.id ?? "–"}
        </span>
        {typeof event.progress === "number" ? (
          <span className="shrink-0 rounded-full bg-[#f7f7f7] px-2 py-0.5 font-mono text-[10px] text-[#717171]">
            {event.progress}%
          </span>
        ) : null}
        <span className="shrink-0 text-[10px] text-[#a0a0a0]">{relTime(_rxAt)}</span>
        {hasExtra ? (
          <span className="shrink-0 text-[#c0c0c0]">
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </span>
        ) : null}
      </button>
      {open && hasExtra ? (
        <div className="border-t border-[#f0f0f0]">
          <pre className="scrollbar-hide overflow-x-auto bg-[#111111] px-3.5 py-3 text-[11px] leading-relaxed text-zinc-100">
            <code>{JSON.stringify(payload, null, 2)}</code>
          </pre>
        </div>
      ) : null}
    </div>
  )
}

function EmptyState({
  connected,
  filter,
  error,
}: {
  connected: boolean
  filter: string
  error: string | null
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#d4d4d4] bg-[#fafafa] py-14 px-6 text-center"
    >
      {connected ? (
        <>
          <span className="flex size-10 items-center justify-center rounded-full bg-[#fff4f0]">
            <Wifi className="size-5 text-[#ff4f12]" />
          </span>
          <p className="text-[14px] font-medium text-[#222222]">Listening for events…</p>
          <p className="text-[12px] leading-relaxed text-[#717171]">
            {filter === "all"
              ? "Upload a file, run a job, or change a library — realtime events from your instance appear here."
              : `Waiting for events matching "${filter}.*".`}
          </p>
        </>
      ) : (
        <>
          <span className="flex size-10 items-center justify-center rounded-full bg-[#f7f7f7]">
            <WifiOff className="size-5 text-[#a0a0a0]" />
          </span>
          <p className="text-[14px] font-medium text-[#222222]">Not connected</p>
          <p className="text-[12px] leading-relaxed text-[#717171]">
            {error ?? "Connecting to your Arciin server…"}
          </p>
          {error ? (
            <ul className="mt-1 max-w-sm text-left text-[11px] text-[#717171]">
              <li>API and Redis must be running on your server</li>
              <li>Stay signed in on this device</li>
              <li>Use the same network as your Arciin host</li>
            </ul>
          ) : null}
        </>
      )}
    </div>
  )
}

export function MobileEventsMonitor() {
  const { connection, ready } = useConnection()
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState<string>("all")
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [bufferedCount, setBufferedCount] = useState(0)

  const pausedRef = useRef(false)
  const bufferRef = useRef<LiveEvent[]>([])

  const socketUrl = connection ? getMobileSocketUrl(connection) : ""

  useEffect(() => {
    if (!ready || !connection?.sessionToken) return

    const resolvedUrl = getMobileSocketUrl(connection)
    const token = connection.sessionToken
    const socket: Socket = io(resolvedUrl, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      auth: { token },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })

    socket.on("connect", () => {
      setConnected(true)
      setError(null)
    })
    socket.on("disconnect", () => setConnected(false))
    socket.on("connect_error", (err) => {
      setConnected(false)
      const msg = err.message || "Could not connect to realtime server."
      setError(
        msg.includes("websocket") || msg.includes("xhr poll")
          ? `${msg} — use the same URL you signed in with (tunnel or LAN). API and Redis must be running on the server.`
          : msg,
      )
    })

    socket.onAny((type: string, incoming: SocketEventPayload) => {
      const event: LiveEvent = {
        id: incoming?.id || crypto.randomUUID(),
        type: (incoming?.type ?? type) as SocketEventPayload["type"],
        userId: incoming?.userId,
        libraryId: incoming?.libraryId,
        uploadId: incoming?.uploadId,
        assetId: incoming?.assetId,
        jobId: incoming?.jobId,
        progress: incoming?.progress,
        message: incoming?.message,
        data: incoming?.data,
        createdAt: incoming?.createdAt || new Date().toISOString(),
        _rxAt: new Date().toISOString(),
        _uid: crypto.randomUUID(),
      }

      setTotal((t) => t + 1)

      if (!pausedRef.current) {
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS))
      } else {
        bufferRef.current.unshift(event)
        setBufferedCount((c) => c + 1)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [ready, connection?.sessionToken, connection?.socketUrl])

  function togglePause() {
    const next = !paused
    pausedRef.current = next
    if (!next) {
      const buffered = bufferRef.current.splice(0)
      setEvents((prev) => [...buffered, ...prev].slice(0, MAX_EVENTS))
      setBufferedCount(0)
    }
    setPaused(next)
  }

  function clear() {
    setEvents([])
    bufferRef.current = []
    setTotal(0)
    setBufferedCount(0)
  }

  const filtered = filter === "all" ? events : events.filter((e) => cat(e.type) === filter)

  if (!ready || !connection) {
    return (
      <p className="py-12 text-center text-[13px] text-[#717171]">Sign in to view the event stream.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-col gap-2 rounded-2xl bg-white p-3.5"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              connected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-[#e5e5e5] bg-[#f7f7f7] text-[#717171]",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                connected ? "animate-pulse bg-emerald-500" : "bg-[#c0c0c0]",
              )}
            />
            {connected ? "Connected" : error ? "Error" : "Connecting…"}
          </div>
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[#a0a0a0]">
            {socketUrl}
          </span>
        </div>

        <PageFetchErrorAlert
          error={error}
          className="rounded-lg px-2.5 py-1.5 text-[11px] text-[#b91c1c]"
        />

        <div className="flex items-center gap-2">
          {paused && bufferedCount > 0 ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {bufferedCount} buffered
            </span>
          ) : null}
          <span className="flex-1 text-[11px] tabular-nums text-[#a0a0a0]">{total} received</span>
          <button
            type="button"
            onClick={togglePause}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
              paused
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-[#e5e5e5] bg-[#f7f7f7] text-[#717171]",
            )}
          >
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 rounded-lg border border-[#e5e5e5] bg-[#f7f7f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#717171]"
          >
            <Trash2 className="size-3" />
            Clear
          </button>
        </div>
      </div>

      <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-0.5">
        {CATEGORIES.map((c) => {
          const count = c === "all" ? events.length : events.filter((e) => cat(e.type) === c).length
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={cn(
                "shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold capitalize",
                filter === c
                  ? "border-[#ff4f12]/35 bg-[#fff4f0] text-[#ff4f12]"
                  : "border-[#e5e5e5] bg-white text-[#717171]",
              )}
            >
              {c}
              {count > 0 ? (
                <span
                  className={cn(
                    "ml-1 rounded px-1 text-[9px] tabular-nums",
                    filter === c ? "bg-[#ff4f12]/15" : "bg-[#f7f7f7]",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {paused ? (
        <p
          className="rounded-xl px-3 py-2 text-[11px] font-medium text-amber-800"
          style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}
        >
          Stream paused — {bufferedCount} buffered. Tap Resume to show them.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <EmptyState connected={connected} filter={filter} error={error} />
        ) : (
          filtered.map((event) => <EventCard key={event._uid} event={event} />)
        )}
      </div>

      <details className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 [&::-webkit-details-marker]:hidden">
          <span className="text-[13px] font-semibold text-[#222222]">Event type reference</span>
          <ChevronDown className="size-4 text-[#a0a0a0]" />
        </summary>
        <div className="border-t border-[#f0f0f0] px-4 py-3">
          <div className="flex flex-col gap-1.5">
            {socketEventTypes.map((t) => (
              <div
                key={t}
                className="rounded-lg border border-[#e5e5e5] bg-[#f7f7f7] px-2.5 py-1.5 font-mono text-[11px] text-[#717171]"
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  )
}
