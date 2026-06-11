"use client"

import { Check } from "lucide-react"

import { MOBILE_ACCENT_COLORS, accentHexMatches } from "@/lib/preferences/accent-colors"
import { cn } from "@/lib/utils"

export function AccentColorPicker({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange: (hex: string) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2" data-accent-picker>
      {MOBILE_ACCENT_COLORS.map((color) => {
        const active = accentHexMatches(value, color.hex)
        return (
          <button
            key={color.hex}
            type="button"
            disabled={disabled}
            onClick={() => onChange(color.hex)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border bg-white px-1.5 py-2.5 disabled:opacity-50",
              active ? "border-[#222222]" : "border-[#e5e5e5]",
            )}
            aria-pressed={active}
            aria-label={color.label}
          >
            <span className="relative shrink-0">
              <span
                data-accent-swatch
                className="block size-7 rounded-full"
                style={{
                  backgroundColor: color.hex,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
              {active ? (
                <Check
                  className="absolute inset-0 m-auto size-3.5 text-white drop-shadow-sm"
                  strokeWidth={3}
                />
              ) : null}
            </span>
            <span className="w-full truncate text-center text-[10px] font-semibold text-[#717171]">
              {color.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
