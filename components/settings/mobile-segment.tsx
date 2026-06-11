"use client"

export function MobileSettingsSegment<T extends string | number>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ label: string; value: T }>
  value: T
  disabled?: boolean
  onChange: (value: T) => void
}) {
  return (
    <div className={label ? "py-3" : ""}>
      {label ? <p className="text-[13px] font-medium text-[#222222]">{label}</p> : null}
      <div className={`flex flex-wrap gap-1.5${label ? " mt-2" : ""}`}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
                active ? "accent-segment-pill" : "border border-[#e5e5e5] bg-white text-[#717171]"
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
