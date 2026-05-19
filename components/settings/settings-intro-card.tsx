"use client"

import type { LucideIcon } from "lucide-react"

export function SettingsIntroCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div
      className="rounded-xl bg-[#f7f7f7] p-3.5"
      style={{ border: "1px solid #e5e5e5" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <Icon className="size-4 text-[#ff4f12]" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#222222]">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">{description}</p>
        </div>
      </div>
    </div>
  )
}
