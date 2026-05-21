"use client"

import { useEffect } from "react"
import { Check } from "lucide-react"

const REDIRECT_MS = 1600

/** Compact success state — same light sign-in chrome, no full-screen takeover. */
export function ConnectionSuccessScreen({
  instanceName,
  onComplete,
}: {
  instanceName: string
  serverUrl: string
  onComplete: () => void
}) {
  useEffect(() => {
    const t = window.setTimeout(onComplete, REDIRECT_MS)
    return () => window.clearTimeout(t)
  }, [onComplete])

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center px-4 pt-safe pb-safe"
      style={{ backgroundColor: "#f7f7f7" }}
      role="status"
      aria-live="polite"
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white px-6 py-8 text-center"
        style={{ border: "1px solid #efefef" }}
      >
        <div
          className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "#fff7ed", border: "1.5px solid #fed7aa" }}
        >
          <Check className="size-6 text-[#ff4f12]" strokeWidth={2.5} />
        </div>
        <p
          className="text-[18px] font-bold tracking-tight text-[#111111]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          Connected
        </p>
        <p className="mt-1 text-[13px] font-medium text-[#717171]">{instanceName}</p>
        <p className="mt-4 text-[12px] leading-relaxed text-[#a0a0a0]">
          Opening your dashboard…
        </p>
      </div>
    </div>
  )
}
