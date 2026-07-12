"use client"

import Link from "next/link"
import { GalleryVerticalEnd, MonitorDot } from "lucide-react"

import { MobileEventsMonitor } from "@/components/events/mobile-events-monitor"
import { MobilePageIntro, MobilePageStickyHeader } from "@/components/shell/mobile-page-intro"
import { socketEventTypes } from "@/lib/types/events"

export function MobileEventsPage() {
  return (
    <div className="flex flex-col gap-4">

      <MobilePageStickyHeader>
        <MobilePageIntro
          title="Events"
          subtitle="Live Socket.IO stream from your Arciin instance — uploads, assets, jobs, and activity in real time."
          status={`${socketEventTypes.length} event types · tap any row to expand payload`}
          cornerIcon={GalleryVerticalEnd}
          statusIcon={GalleryVerticalEnd}
        />
      </MobilePageStickyHeader>

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
