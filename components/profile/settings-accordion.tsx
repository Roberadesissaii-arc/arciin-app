"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"

export function SettingsAccordion({
  icon: Icon,
  label,
  sub,
  open,
  onToggle,
  children,
  footerHref,
  footerLabel,
}: {
  icon: React.ElementType
  label: string
  sub?: string
  open: boolean
  onToggle: () => void
  children?: React.ReactNode
  footerHref?: string
  footerLabel?: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-[#f7f7f7]"
        aria-expanded={open}
      >
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <Icon className="size-[15px] text-[#717171]" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[14px] font-medium text-[#222222]">{label}</p>
          {sub ? <p className="text-[11px] text-[#a0a0a0]">{sub}</p> : null}
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-[#c0c0c0] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && children ? (
        <div className="border-t border-[#f0f0f0] px-4 py-4">{children}</div>
      ) : null}
      {footerHref && footerLabel ? (
        <Link
          href={footerHref}
          className="block w-full border-t border-[#f0f0f0] px-4 py-2.5 text-center text-[12px] font-semibold text-[#ff4f12] active:opacity-70"
        >
          {footerLabel}
        </Link>
      ) : null}
    </div>
  )
}
