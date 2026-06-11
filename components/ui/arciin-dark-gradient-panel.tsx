"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Black surface + accent ember glow — glow tracks Preferences → Accent color. */
export function ArciinDarkGradientPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#09090b] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <div className="arciin-dark-hero__wash pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="arciin-dark-hero__glow-main pointer-events-none absolute -top-24 left-1/2 aspect-[1.35] w-[min(92%,400px)] -translate-x-1/2 blur-[52px]"
        aria-hidden
      />
      <div
        className="arciin-dark-hero__glow-secondary pointer-events-none absolute -top-14 left-[18%] h-[200px] w-[min(55%,260px)] blur-[40px]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
