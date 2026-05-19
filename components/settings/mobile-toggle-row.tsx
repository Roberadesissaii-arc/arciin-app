"use client"

import Link from "next/link"

export function MobilePillSwitch({
  on,
  disabled,
  onChange,
  label,
  hint,
}: {
  on: boolean
  disabled?: boolean
  onChange: () => void
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[#222222]">{label}</p>
        {hint ? <p className="mt-0.5 text-[11px] leading-relaxed text-[#a0a0a0]">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={onChange}
        className="relative shrink-0 transition-colors disabled:opacity-50"
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          backgroundColor: on ? "#ff4f12" : "#e5e5e5",
        }}
      >
        <span
          className="absolute top-[3px] size-5 rounded-full bg-white shadow-sm transition-transform"
          style={{ left: 3, transform: on ? "translateX(18px)" : "translateX(0)" }}
        />
      </button>
    </div>
  )
}

/** Secondary action at the bottom of an expanded settings panel (only visible when open). */
export function SettingsPanelLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-3 flex h-10 items-center justify-center rounded-xl text-[13px] font-semibold text-[#ff4f12] active:opacity-70"
      style={{ border: "1px solid rgba(255,79,18,0.35)", backgroundColor: "rgba(255,79,18,0.06)" }}
    >
      {label}
    </Link>
  )
}
