"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"

export function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
      {children}
    </div>
  )
}

export function SettingsGroupItem({
  icon: Icon,
  label,
  sub,
  open,
  onToggle,
  children,
  footerHref,
  footerLabel,
  disabled,
  soon,
}: {
  icon: React.ElementType
  label: string
  sub?: string
  open: boolean
  onToggle: () => void
  children?: React.ReactNode
  footerHref?: string
  footerLabel?: string
  disabled?: boolean
  soon?: boolean
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => !disabled && !soon && onToggle()}
        disabled={disabled || soon}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-[#f7f7f7] disabled:opacity-60"
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
        {soon ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#a0a0a0]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            Soon
          </span>
        ) : (
          <ChevronDown
            className={`size-4 shrink-0 text-[#c0c0c0] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>
      {open && children ? (
        <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-3">
          {children}
          {footerHref && footerLabel ? (
            <Link
              href={footerHref}
              className="mt-3 flex h-10 items-center justify-center rounded-xl text-[13px] font-semibold text-[#ff4f12] active:opacity-70"
              style={{ border: "1px solid rgba(255,79,18,0.35)", backgroundColor: "rgba(255,79,18,0.06)" }}
            >
              {footerLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function SettingsGroupDivider() {
  return <div className="mx-4 h-px bg-[#f0f0f0]" />
}
