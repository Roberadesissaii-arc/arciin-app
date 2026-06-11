"use client"

import { cn } from "@/lib/utils"

export function AuthMobileField({
  id,
  label,
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  right,
  autoComplete,
  error,
  mono,
  dense,
}: {
  id: string
  label: string
  icon: React.ElementType
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  right?: React.ReactNode
  autoComplete?: string
  error?: string | null
  mono?: boolean
  dense?: boolean
}) {
  const invalid = Boolean(error)

  return (
    <div className={cn("flex flex-col", dense ? "gap-1" : "gap-1.5")}>
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]"
      >
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-4 transition-colors",
          dense ? "py-3" : "py-3.5",
          invalid
            ? "border-[#fca5a5] bg-[#fffafa]"
            : "border-[#e8e8e8] bg-[#f7f7f7]",
        )}
      >
        <Icon
          className={cn("size-[16px] shrink-0", invalid ? "text-[#f87171]" : "text-[#c0c0c0]")}
          aria-hidden
        />
        <input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-[#222222] outline-none placeholder:text-[#c0c0c0]",
            mono
              ? "font-mono text-[13px] placeholder:text-[13px]"
              : "text-[16px] placeholder:text-[14px]",
          )}
        />
        {right}
      </div>
      {error ? (
        <p id={`${id}-error`} className="px-1 text-[11px] font-medium text-[#dc2626]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Compact form-level message — sits above the primary button without a banner. */
export function AuthMobileFormMessage({
  message,
  tone = "error",
}: {
  message?: string | null
  tone?: "error" | "info"
}) {
  if (!message) return null

  return (
    <p
      className={cn(
        "text-center text-[12px] leading-snug",
        tone === "error" ? "text-[#dc2626]" : "text-[#717171]",
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      {message}
    </p>
  )
}
