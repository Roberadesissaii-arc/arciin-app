import { ArciinMark } from "@/components/ui/arciin-mark"
import { cn } from "@/lib/utils"

/** Mirrors desktop “Web · desktop” — identifies this as the mobile app hero badge. */
export function AuthMobilePlatformBadge({
  className,
}: {
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90",
        className,
      )}
    >
      Mobile
    </span>
  )
}

/** White wordmark for the orange hero card. */
export function AuthMobileHeroWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 text-[38px] font-black leading-none tracking-tight text-white",
        className,
      )}
      style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
    >
      Arciin<span style={{ color: "rgba(255,255,255,0.36)" }}>.</span>
    </span>
  )
}

export function AuthMobileHeroHeader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <AuthMobileHeroWordmark />
      <AuthMobilePlatformBadge className="mt-1 shrink-0" />
    </div>
  )
}

/** Wordmark + “Mobile” pinned below auth cards (sign-in, forgot password). */
export function AuthMobileBrandFooter({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center gap-1.5 px-4 pb-1 pt-4",
        className,
      )}
      aria-label="Arciin Mobile"
    >
      <ArciinMark size="sm" />
      <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#c0c0c0]">
        Mobile
      </span>
    </div>
  )
}
