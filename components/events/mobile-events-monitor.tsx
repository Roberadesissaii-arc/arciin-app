"use client"

import { useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { ChevronDown, ChevronRight, Pause, Play, Radio, Trash2, Wifi, WifiOff } from "lucide-react"

import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import { useConnection } from "@/components/providers/connection-provider"
import { getMobileSocketUrl } from "@/lib/realtime/socket-url"
import type { MobileConnection } from "@/lib/types/api"
import { socketEventTypes, type SocketEventPayload } from "@/lib/types/events"
import { cn } from "@/lib/utils"

const MAX_EVENTS = 300

type LiveEvent = SocketEventPayload & { _rxAt: string; _uid: string }

const ROW_STYLE: Record<string, string> = {
  upload: "border-l-blue-500 bg-blue-50/50",
  asset: "border-l-violet-500 bg-violet-50/40",
  thumbnail: "border-l-[#ff4f12] bg-orange-50/40",
  media: "border-l-[#ff4f12] bg-orange-50/40",
  library: "border-l-emerald-500 bg-emerald-50/40",
  job: "border-l-amber-500 bg-amber-50/40",
  activity: "border-l-zinc-400 bg-zinc-50/80",
  plex: "border-l-yellow-500 bg-yellow-50/40",
}

const BADGE_STYLE: Record<string, string> = {
  upload: "border-blue-200/80 bg-blue-50 text-blue-800",
  asset: "border-violet-200/80 bg-violet-50 text-violet-800",
  thumbnail: "border-orange-200/80 bg-orange-50 text-orange-800",
  media: "border-orange-200/80 bg-orange-50 text-orange-800",
  library: "border-emerald-200/80 bg-emerald-50 text-emerald-800",
  job: "border-amber-200/80 bg-amber-50 text-amber-900",
  activity: "border-zinc-200/80 bg-zinc-100 text-zinc-700",
  plex: "border-yellow-200/80 bg-yellow-50 text-yellow-900",
}

const CATEGORIES = ["all", "upload", "asset", "media", "library", "job", "activity", "plex"] as const

function cat(type: string) {
  return type.split(".")[0] ?? "activity"
}

function catStyle(type: string) {
  const category = cat(type)
  return BADGE_STYLE[category] ?? "border-zinc-200/80 bg-zinc-100 text-zinc-700"
}

function rowStyle(type: string) {
  const category = cat(type)
  return ROW_STYLE[category] ?? "border-l-zinc-300 bg-white"
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
      className={cn(
        "overflow-hidden rounded-xl border border-[#e5e5e5] border-l-[3px] bg-white shadow-sm",
        rowStyle(event.type),
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
        onClick={() => hasExtra && setOpen((o) => !o)}
      >
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold",
            catStyle(event.type),
          )}
        >
          {event.type}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-[#222222]">
          {event.message ?? event.id ?? "–"}
        </span>
        {typeof event.progress === "number" ? (
          <span className="shrink-0 rounded-full bg-[#f7f7f7] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#717171]">
            {event.progress}%
          </span>
        ) : null}
        <span className="shrink-0 text-[10px] tabular-nums text-[#a0a0a0]">{relTime(_rxAt)}</span>
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

type StreamConnectionState = "connecting" | "connected" | "disconnected" | "error"

function connectionStatusLabel(state: StreamConnectionState, error: string | null) {
  if (state === "connected") return "Connected · receiving live events"
  if (state === "error") return error ? "Connection error" : "Could not connect"
  if (state === "disconnected") return "Disconnected from realtime server"
  return "Connecting to realtime server…"
}

function ConnectionStatusDot({ state }: { state: StreamConnectionState }) {
  const label =
    state === "connected"
      ? "Connected"
      : state === "connecting"
        ? "Connecting"
        : state === "error"
          ? "Connection error"
          : "Disconnected"

  return (
    <span
      className={cn(
        "absolute right-3.5 top-3.5 size-2.5 rounded-full ring-[2.5px] ring-white",
        state === "connected" && "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.22)]",
        state === "connecting" && "animate-pulse bg-zinc-400 shadow-[0_0_0_3px_rgba(161,161,170,0.18)]",
        (state === "disconnected" || state === "error") &&
          "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.2)]",
      )}
      role="status"
      aria-label={label}
      title={label}
    />
  )
}

function StreamControlPanel({
  connectionState,
  connection,
  socketUrl,
  error,
  total,
  paused,
  bufferedCount,
  onTogglePause,
  onClear,
}: {
  connectionState: StreamConnectionState
  connection: MobileConnection
  socketUrl: string
  error: string | null
  total: number
  paused: boolean
  bufferedCount: number
  onTogglePause: () => void
  onClear: () => void
}) {
  const pageUrl = (connection.webUrl || connection.apiBaseUrl.replace(/\/api\/?$/i, "")).replace(
    /\/+$/,
    "",
  )
  const showSocketLine = socketUrl.replace(/\/+$/, "") !== pageUrl.replace(/\/+$/, "")

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white p-4"
      style={{ border: "1px solid #e5e5e5", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
    >
      <ConnectionStatusDot state={connectionState} />

      <div className="pr-5">
        <p className="text-[13px] font-semibold text-[#222222]">Live stream</p>
        <p className="mt-0.5 text-[11px] text-[#717171]">
          {connectionStatusLabel(connectionState, error)}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        <div
          className="rounded-xl border border-[#ececec] bg-[#fafafa] px-3 py-2.5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a0a0a0]">
            Instance URL
          </p>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-[#222222]">
            {pageUrl}
          </p>
        </div>

        {showSocketLine ? (
          <div className="rounded-xl border border-[#ececec] bg-white px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a0a0a0]">
              Realtime endpoint
            </p>
            <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-[#717171]">
              {socketUrl}
              <span className="text-[#a0a0a0]">/socket.io</span>
            </p>
          </div>
        ) : (
          <p className="px-0.5 text-[10px] text-[#a0a0a0]">
            Socket.IO on this origin · path{" "}
            <span className="font-mono text-[#717171]">/socket.io</span>
          </p>
        )}
      </div>

      {error ? (
        <div className="mt-3">
          <PageFetchErrorAlert
            error={error}
            className="rounded-xl px-3 py-2 text-[11px] text-[#b91c1c]"
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 border-t border-[#f0f0f0] pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tabular-nums text-[#222222]">
            {total.toLocaleString()} received
          </p>
          {paused && bufferedCount > 0 ? (
            <p className="mt-0.5 text-[10px] font-medium text-amber-700">
              {bufferedCount} buffered while paused
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] text-[#a0a0a0]">
              {connectionState === "connected" ? "Tap a row to expand payload" : "Waiting for connection"}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onTogglePause}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold",
            paused
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-[#e5e5e5] bg-[#f7f7f7] text-[#717171] active:bg-white",
          )}
        >
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-xl border border-[#dc2626] bg-[#ef4444] px-3 py-2 text-[11px] font-semibold text-white active:opacity-90"
        >
          <Trash2 className="size-3.5" />
          Clear
        </button>
      </div>
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
            <Wifi className="size-5 text-accent" />
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
  const [connectionState, setConnectionState] = useState<StreamConnectionState>("connecting")
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState<string>("all")
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [bufferedCount, setBufferedCount] = useState(0)

  const connected = connectionState === "connected"

  const pausedRef = useRef(false)
  const bufferRef = useRef<LiveEvent[]>([])

  const socketUrl = connection ? getMobileSocketUrl(connection) : ""

  useEffect(() => {
    if (!ready || !connection?.sessionToken) return

    setConnectionState("connecting")
    setError(null)

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

    socket.io.on("reconnect_attempt", () => {
      setConnectionState("connecting")
    })
    socket.io.on("reconnect", () => {
      setConnectionState("connected")
      setError(null)
    })

    socket.on("connect", () => {
      setConnectionState("connected")
      setError(null)
    })
    socket.on("disconnect", () => {
      setConnectionState("disconnected")
    })
    socket.on("connect_error", (err) => {
      setConnectionState("error")
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
      <StreamControlPanel
        connectionState={connectionState}
        connection={connection}
        socketUrl={socketUrl}
        error={error}
        total={total}
        paused={paused}
        bufferedCount={bufferedCount}
        onTogglePause={togglePause}
        onClear={clear}
      />

      <div
        className="overflow-hidden rounded-2xl bg-white shadow-sm"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div
          className="flex flex-wrap items-center gap-2 border-b border-[#f0f0f0] px-4 py-3"
          style={{ backgroundColor: "#fafafa" }}
        >
          <Radio className="text-accent size-4" />
          <span className="text-[13px] font-semibold text-[#222222]">Event stream</span>
          <span className="text-[11px] text-[#717171]">
            {filtered.length} shown
            {filter !== "all" ? ` · ${filter}.*` : ""}
          </span>
        </div>

        <div className="border-b border-[#f0f0f0] px-4 py-3">
          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto pb-0.5">
            {CATEGORIES.map((c) => {
              const count = c === "all" ? events.length : events.filter((e) => cat(e.type) === c).length
              const active = filter === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  className={cn(
                    "shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold capitalize transition-colors",
                    active
                      ? "btn-accent-solid border-[#e04300] text-white shadow-sm"
                      : "border-transparent bg-[#f0f0f0] text-[#717171] active:bg-[#e8e8e8]",
                  )}
                >
                  {c}
                  {count > 0 ? (
                    <span
                      className={cn(
                        "ml-1 rounded px-1 text-[9px] tabular-nums",
                        active ? "bg-white/20 text-white" : "bg-white text-[#717171]",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2 p-4">
          {paused ? (
            <p
              className="rounded-xl border border-[#fde68a] px-3 py-2 text-[11px] font-medium text-amber-800"
              style={{ backgroundColor: "#fffbeb" }}
            >
              Stream paused — {bufferedCount} buffered. Tap Resume to show them.
            </p>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState connected={connected} filter={filter} error={error} />
          ) : (
            filtered.map((event) => <EventCard key={event._uid} event={event} />)
          )}
        </div>
      </div>

      <details className="group overflow-hidden rounded-2xl bg-white shadow-sm" style={{ border: "1px solid #e5e5e5" }}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 active:bg-[#fafafa] [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <Radio className="text-accent size-4 shrink-0" />
            <span className="text-[13px] font-semibold text-[#222222]">Event type reference</span>
            <span className="rounded-md bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-semibold text-[#717171]">
              {socketEventTypes.length} types
            </span>
          </div>
          <ChevronDown className="size-4 shrink-0 text-[#a0a0a0] transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#f0f0f0] px-4 py-3" style={{ backgroundColor: "#fafafa" }}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {socketEventTypes.map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm"
              >
                <span className="bg-accent/70 size-1.5 shrink-0 rounded-full" />
                <span className="font-mono text-[11px] text-[#717171]">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  )
}
