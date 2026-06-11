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
    <div className="accent-highlight-box rounded-xl p-3.5">
      <div className="flex items-start gap-3">
        <div className="accent-icon-tile flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/80">
          <Icon className="text-accent size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#222222]">{title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">{description}</p>
        </div>
      </div>
    </div>
  )
}
