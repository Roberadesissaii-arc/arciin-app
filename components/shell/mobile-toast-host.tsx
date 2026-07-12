"use client"

import { useEffect, useState } from "react"
import { CircleCheck, CloudUpload, Info, TriangleAlert } from "lucide-react"

import {
  subscribeMobileToast,
  type MobileToastNotice,
  type MobileToastVariant,
} from "@/lib/notifications/mobile-toast"

const AUTO_DISMISS_MS = 4800

const VARIANT_ICON: Record<MobileToastVariant, typeof CircleCheck> = {
  success: CircleCheck,
  error: TriangleAlert,
  warning: TriangleAlert,
  info: Info,
}

const VARIANT_ICON_COLOR: Record<MobileToastVariant, string> = {
  success: "#16a34a",
  error: "#dc2626",
  warning: "#b45309",
  info: "var(--arciin-accent, #ff4f12)",
}

/**
 * Floating toast card, mounted once at the app root — visible on every page,
 * for realtime events (e.g. an upload finishing on another device) that would
 * otherwise only bump the notifications badge silently.
 */
export function MobileToastHost() {
  const [notices, setNotices] = useState<MobileToastNotice[]>([])

  useEffect(() => {
    return subscribeMobileToast((notice) => {
      setNotices((prev) => [...prev, notice])
      window.setTimeout(() => {
        setNotices((prev) => prev.filter((n) => n.id !== notice.id))
      }, AUTO_DISMISS_MS)
    })
  }, [])

  if (notices.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[300] flex flex-col items-center gap-2 px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}
    >
      {notices.map((notice) => {
        const Icon = VARIANT_ICON[notice.variant]
        const isUpload = notice.title.toLowerCase().includes("upload")
        return (
          <div
            key={notice.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white p-3.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
              style={{ border: "1px solid #e5e5e5" }}
            >
              {isUpload ? (
                <CloudUpload className="size-4" style={{ color: VARIANT_ICON_COLOR[notice.variant] }} />
              ) : (
                <Icon className="size-4" style={{ color: VARIANT_ICON_COLOR[notice.variant] }} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#222222]">{notice.title}</p>
              {notice.description ? (
                <p className="mt-0.5 text-[12px] leading-relaxed text-[#717171]">
                  {notice.description}
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
