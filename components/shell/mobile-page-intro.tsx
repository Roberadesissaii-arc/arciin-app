"use client"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const titleStyle = { fontFamily: "var(--font-space-grotesk, sans-serif)" } as const

export function MobilePageStickyHeader({ children }: { children: ReactNode }) {
  return <div className="mobile-page-sticky-header">{children}</div>
}

export function MobilePageIntroStatusPill({
  children,
  icon: Icon,
  className,
}: {
  children: ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <span className={cn("mobile-page-intro-status-pill", className)}>
      {Icon ? <Icon className="text-accent size-3.5" /> : null}
      {children}
    </span>
  )
}

export function MobilePageIntro({
  title,
  subtitle,
  description,
  status,
  statusIcon,
  footerRight,
  meta,
  cornerIcon: CornerIcon,
  action,
  footer,
  className,
}: {
  title: string
  subtitle?: ReactNode
  description?: ReactNode
  status?: ReactNode
  statusIcon?: LucideIcon
  footerRight?: ReactNode
  meta?: ReactNode
  cornerIcon?: LucideIcon
  action?: ReactNode
  /** Replaces the default footer row (status pill + footerRight). */
  footer?: ReactNode
  className?: string
}) {
  const defaultFooter = (
    <>
      <div className="min-w-0">
        {status ? (
          <MobilePageIntroStatusPill icon={statusIcon}>{status}</MobilePageIntroStatusPill>
        ) : (
          <span className="mobile-page-intro-status-pill mobile-page-intro-status-pill--muted">
            Ready
          </span>
        )}
      </div>
      {footerRight ? <div className="shrink-0">{footerRight}</div> : null}
    </>
  )

  return (
    <div className={cn("mobile-page-intro", className)}>
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 100% 0%, color-mix(in srgb, var(--arciin-accent, #ff4f12) 11%, transparent) 0%, transparent 58%)",
        }}
      />
      {CornerIcon ? (
        <CornerIcon
          className="text-accent pointer-events-none absolute -right-2 -top-2 size-24 opacity-[0.07] sm:size-28"
          strokeWidth={1.25}
          aria-hidden
        />
      ) : null}

      <div className={cn("mobile-page-intro__content relative", CornerIcon && "pr-7 sm:pr-8")}>
        <div className="flex items-start justify-between gap-2">
          <h2
            className="min-w-0 text-[20px] font-semibold leading-none tracking-tight text-[#222222]"
            style={titleStyle}
          >
            {title}
            <span className="text-accent">.</span>
          </h2>
          {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
        </div>

        {subtitle ? (
          <p className="mobile-page-intro__subtitle mt-2 text-[12px] leading-relaxed text-[#717171]">
            {subtitle}
          </p>
        ) : (
          <div className="mobile-page-intro__subtitle mt-2" aria-hidden />
        )}

        {description ? (
          <p className="mobile-page-intro__description mt-1.5 text-[12px] leading-relaxed text-[#717171]">
            {description}
          </p>
        ) : (
          <div className="mobile-page-intro__description mt-1.5" aria-hidden />
        )}

        {meta ? <div className="mt-1.5 text-[10px] text-[#a0a0a0]">{meta}</div> : null}
      </div>

      <div className="mobile-page-intro__footer relative">{footer ?? defaultFooter}</div>
    </div>
  )
}

export function MobilePageIntroIconButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl border border-[#e5e5e5] bg-white text-[#717171] active:bg-[#f7f7f7]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
