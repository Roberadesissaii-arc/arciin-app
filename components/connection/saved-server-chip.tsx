"use client"

import { Server } from "lucide-react"

import { getServerAddressDisplay } from "@/lib/connection/normalize-url"

/** Login only: minimal row when a real public domain is saved (not LAN, tunnel, or Vercel). */
export function LoginDomainChip({
  apiBaseUrl,
  webUrl,
}: {
  apiBaseUrl: string
  webUrl?: string | null
}) {
  const display = getServerAddressDisplay(apiBaseUrl, webUrl)
  if (display.kind !== "public") return null

  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-xl px-3 py-2"
      style={{ backgroundColor: "#f7f7f7", border: "1px solid #efefef" }}
    >
      <Server className="text-accent size-3.5 shrink-0" aria-hidden />
      <p
        className="min-w-0 flex-1 truncate text-[12px] text-[#717171]"
        title={display.host}
      >
        <span className="text-[#a0a0a0]">Domain</span>
        <span className="text-[#c0c0c0]"> · </span>
        <span className="font-mono text-[12px] text-[#222222]">{display.host}</span>
      </p>
    </div>
  )
}
