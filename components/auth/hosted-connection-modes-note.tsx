"use client"

import { Globe, WifiOff } from "lucide-react"

/** Explains which server connection modes work on the Vercel-hosted install. */
export function HostedConnectionModesNote() {
  return (
    <div
      className="rounded-2xl px-3.5 py-3"
      style={{ backgroundColor: "#18181b", border: "1px solid #3f3f46" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a1a1aa]">
        Connection modes here
      </p>
      <ul className="mt-2.5 flex flex-col gap-2">
        <li className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255,79,18,0.15)" }}
          >
            <Globe className="size-3 text-[#ff4f12]" />
          </span>
          <span className="min-w-0 text-left text-[12px] leading-snug text-[#e4e4e7]">
            <strong className="font-semibold text-white">From anywhere</strong>
            <span className="text-[#22c55e]"> — available</span>
            <span className="mt-0.5 block text-[#a1a1aa]">
              Use your public HTTPS address (Settings → Domain on your server).
            </span>
          </span>
        </li>
        <li className="flex items-start gap-2.5 opacity-70">
          <span
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#27272a]"
          >
            <WifiOff className="size-3 text-[#71717a]" />
          </span>
          <span className="min-w-0 text-left text-[12px] leading-snug text-[#a1a1aa]">
            <strong className="font-medium text-[#d4d4d8]">On my network</strong>
            <span> — not available</span>
            <span className="mt-0.5 block">Home LAN cannot be reached from this install.</span>
          </span>
        </li>
      </ul>
    </div>
  )
}
