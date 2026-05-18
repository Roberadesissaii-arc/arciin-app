"use client"

import { Smartphone } from "lucide-react"

export function DesktopUnavailable() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white px-8">
      <div className="flex max-w-xs flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div
          className="flex size-16 items-center justify-center rounded-3xl bg-[#f7f7f7]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <Smartphone className="size-7" style={{ color: "#ff4f12" }} />
        </div>

        {/* Wordmark */}
        <p
          className="text-[15px] font-bold tracking-tight text-[#222222]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          Arciin<span style={{ color: "#ff4f12" }}>.</span>
        </p>

        {/* Headline */}
        <div className="space-y-2.5">
          <h1
            className="text-[24px] font-bold leading-tight tracking-tight text-[#222222]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            Mobile only
          </h1>
          <p className="text-[14px] leading-relaxed text-[#717171]">
            This app is designed for your phone. Open it on a mobile device or resize your
            window.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px w-16 rounded-full bg-[#e5e5e5]" />

        {/* Desktop hint */}
        <p className="text-[13px] text-[#a0a0a0]">
          Looking for the full dashboard?{" "}
          <span style={{ color: "#ff4f12" }}>Use the desktop web app.</span>
        </p>
      </div>
    </div>
  )
}
