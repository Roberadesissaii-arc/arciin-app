import { cn } from "@/lib/utils"

const sizeClass = {
  sm: "text-[15px]",
  md: "text-[20px]",
  lg: "text-[28px]",
} as const

/** Wordmark: Arciin + orange dot (matches home header). */
export function ArciinMark({
  size = "md",
  className,
}: {
  size?: keyof typeof sizeClass
  className?: string
}) {
  return (
    <span
      className={cn("font-bold tracking-tight text-[#222222]", sizeClass[size], className)}
      style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
    >
      Arciin<span style={{ color: "#ff4f12" }}>.</span>
    </span>
  )
}
