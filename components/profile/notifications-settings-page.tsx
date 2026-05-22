"use client"

import Link from "next/link"
import { Bell, ChevronRight } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { profileSectionSubtitle } from "@/lib/connection/offline-ui"

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
      {label}
    </p>
  )
}

/**
 * Mobile uses the activity notifications screen (bell), not desktop-style toast popups.
 */
export function NotificationsSettingsPage() {
  const { serverReachable } = useConnection()

  return (
    <div className="flex flex-col gap-5">
      <div
        className="overflow-hidden rounded-2xl bg-white p-5"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#fff4f0]">
          <Bell className="size-6 text-[#ff4f12]" />
        </div>
        <h1
          className="mt-4 text-[20px] font-bold tracking-tight text-[#222222]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          Activity notifications
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#717171]">
          On mobile, uploads and activity from your Arciin server appear in the
          notifications list — the same feed as on desktop, without separate toast
          popups on this device.
        </p>
        <p className="mt-2 text-[12px] text-[#a0a0a0]">
          {profileSectionSubtitle(
            serverReachable,
            "Open the bell on Home to see recent events.",
            "Reconnect your server to load notifications.",
          )}
        </p>
      </div>

      <Link
        href="/notifications"
        className="flex items-center gap-3.5 rounded-2xl bg-white px-4 py-4 active:bg-[#f7f7f7]"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div
          className="flex size-10 items-center justify-center rounded-xl bg-[#f7f7f7]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <Bell className="size-5 text-[#717171]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#222222]">Open notifications</p>
          <p className="text-[11px] text-[#a0a0a0]">Uploads, files, and security activity</p>
        </div>
        <ChevronRight className="size-4 text-[#c0c0c0]" />
      </Link>
    </div>
  )
}
