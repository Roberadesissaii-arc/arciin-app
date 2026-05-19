"use client"

import Link from "next/link"
import { MonitorDot } from "lucide-react"

import { MobileEventsMonitor } from "@/components/events/mobile-events-monitor"
import { socketEventTypes } from "@/lib/types/events"

export function MobileEventsPage() {
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
              Events
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Live Socket.IO stream from your Arciin instance — uploads, assets, jobs, and activity in real time.
            </p>
            <p className="mt-2 text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
              {socketEventTypes.length} event types · tap any row to expand payload
            </p>
          </div>
        </div>
      </div>

      <MobileEventsMonitor />

      <Link
        href="/activity"
        className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-semibold text-[#717171] active:bg-[#f7f7f7]"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <MonitorDot className="size-4" />
        View activity timeline instead
      </Link>
    </div>
  )
}
