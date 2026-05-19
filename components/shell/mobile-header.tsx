"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell } from "lucide-react"

import { MobileSearch } from "@/components/shell/mobile-search"
import {
  countUnreadActivity,
  fetchRecentActivity,
  getNotificationsLastSeen,
} from "@/lib/api/notifications"
import { useConnection } from "@/components/providers/connection-provider"

/** Home-only top bar: logo, search, notifications. Stays fixed while scrolling. */
export function MobileHeader() {
  const pathname = usePathname()
  const { connection, ready } = useConnection()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!ready || !connection) {
      setUnreadCount(0)
      return
    }

    let cancelled = false
    const controller = new AbortController()

    void (async () => {
      try {
        const items = await fetchRecentActivity(connection, controller.signal)
        if (!cancelled) {
          setUnreadCount(countUnreadActivity(items, getNotificationsLastSeen()))
        }
      } catch {
        if (!cancelled) setUnreadCount(0)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [ready, connection])

  if (pathname !== "/home") return null

  return (
    <header className="z-40 shrink-0 border-b border-[#e5e5e5] bg-white pt-safe">
      <div className="flex h-14 items-center gap-2 px-4">
        <Link href="/home" className="flex shrink-0 items-center">
          <span
            className="text-[17px] font-bold tracking-tight text-[#222222]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            Arciin<span style={{ color: "#ff4f12" }}>.</span>
          </span>
        </Link>

        <MobileSearch />

        <Link
          href="/notifications"
          className="relative flex size-9 shrink-0 items-center justify-center rounded-xl text-[#717171] transition-colors active:bg-[#f7f7f7]"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
          }
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#ff4f12]"
              style={{ boxShadow: "0 0 0 2px #ffffff" }}
            />
          ) : null}
        </Link>
      </div>
    </header>
  )
}
