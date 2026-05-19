"use client"

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** Black surface + orange ember glow — matches desktop login/setup left panel. */
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
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,75,51,0.12)_0%,rgba(9,9,11,0.06)_28%,rgba(9,9,11,0.35)_55%,transparent_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 left-1/2 aspect-[1.35] w-[min(92%,400px)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,75,51,0.45)_0%,rgba(255,75,51,0.12)_42%,transparent_72%)] blur-[52px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-14 left-[18%] h-[200px] w-[min(55%,260px)] bg-[radial-gradient(ellipse_at_center,rgba(255,120,90,0.22)_0%,transparent_68%)] blur-[40px]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
