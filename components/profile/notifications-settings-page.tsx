"use client"

import Link from "next/link"
import { Bell, ChevronRight } from "lucide-react"

import { NotificationsInlinePanel } from "@/components/profile/notifications-inline-panel"
import { useConnection } from "@/components/providers/connection-provider"
import { profileSectionSubtitle } from "@/lib/connection/offline-ui"

/**
 * Notification preferences plus link to the activity feed (bell on Home).
 */
export function NotificationsSettingsPage() {
  const { serverReachable } = useConnection()

  return (
    <div
      className="-mx-4 -mt-4 flex flex-col gap-5 px-4 pb-2"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 0px))" }}
    >
      <div
        className="overflow-hidden rounded-2xl bg-white p-5"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#fff4f0]">
          <Bell className="text-accent size-6" />
        </div>
        <h1
          className="mt-4 text-[20px] font-bold tracking-tight text-[#222222]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          Notifications
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#717171]">
          Choose which events appear in your activity feed. Uploads and security alerts from your
          Arciin server show up under the bell on Home.
        </p>
        <p className="mt-2 text-[12px] text-[#a0a0a0]">
          {profileSectionSubtitle(
            serverReachable,
            "Changes save to your account on this server.",
            "Reconnect your server to change preferences.",
          )}
        </p>
      </div>

      <div
        className="overflow-hidden rounded-2xl bg-white px-4 py-4"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <NotificationsInlinePanel enabled />
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
          <p className="text-[14px] font-semibold text-[#222222]">Open activity feed</p>
          <p className="text-[11px] text-[#a0a0a0]">Uploads, files, and security activity</p>
        </div>
        <ChevronRight className="size-4 text-[#c0c0c0]" />
      </Link>
    </div>
  )
}
