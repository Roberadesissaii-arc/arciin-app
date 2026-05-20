"use client"

import { Server } from "lucide-react"

import { getServerAddressDisplay } from "@/lib/connection/normalize-url"

export function SavedServerChip({
  apiBaseUrl,
  webUrl,
  caption = "Your Arciin server (saved on this phone)",
}: {
  apiBaseUrl: string
  webUrl?: string | null
  caption?: string
}) {
  const { kindLabel, host, hint, kind } = getServerAddressDisplay(apiBaseUrl, webUrl)
  const needsAttention = kind === "app_host" || kind === "localhost" || kind === "tunnel"

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        backgroundColor: needsAttention ? "#fffbeb" : "#f7f7f7",
        border: `1px solid ${needsAttention ? "#fde68a" : "#efefef"}`,
      }}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Server className="mt-0.5 size-3.5 shrink-0 text-[#ff4f12]" aria-hidden />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            {caption}
          </p>
          <p
            className="mt-0.5 truncate text-[13px] font-medium text-[#222222]"
            title={`${kindLabel}: ${host}`}
          >
            <span className="text-[#717171]">{kindLabel}</span>
            <span className="text-[#c0c0c0]"> · </span>
            <span className="font-mono text-[12px]">{host}</span>
          </p>
          {hint ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#b45309]">{hint}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
