"use client"

import type { LucideIcon } from "lucide-react"
import { CheckCircle2 } from "lucide-react"

type CompactStatusBannerProps = {
  title: string
  detail?: string
  icon?: LucideIcon
}

/** Compact accent-ring status row (upload complete, settings saved, etc.). */
export function CompactStatusBanner({
  title,
  detail,
  icon: Icon = CheckCircle2,
}: CompactStatusBannerProps) {
  return (
    <div className="server-offline-banner shadow-[0_1px_0_rgba(0,0,0,0.04)]" role="status">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
        <div className="server-offline-banner__ring" />
      </div>
      <div className="server-offline-banner__panel">
        <div className="flex items-center gap-2 px-4 py-3">
          <Icon className="text-accent size-4 shrink-0" strokeWidth={2} aria-hidden />
          <p className="min-w-0 flex-1 text-[12px] leading-snug">
            <span className="font-semibold text-[#222222]">{title}</span>
            {detail ? (
              <span className="font-normal text-[#717171]"> · {detail}</span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  )
}
