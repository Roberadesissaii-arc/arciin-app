"use client"

import { BrandHeroCarousel } from "@/components/auth/brand-hero"
import { AuthMobileBrandFooter } from "@/components/auth/auth-mobile-branding"
import { AuthMobileLegalFooter } from "@/components/auth/auth-mobile-legal-footer"

export function AuthMobileShell({
  children,
  heroPage = 0,
  compact = false,
  showLegalFooter = false,
}: {
  children: React.ReactNode
  heroPage?: 0 | 1
  /** Shrink the card to content — use on dense forms like forgot password. */
  compact?: boolean
  /** Privacy / Terms links below the card — matches desktop setup footer. */
  showLegalFooter?: boolean
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f7f7f7] pt-safe">
      <BrandHeroCarousel activePage={heroPage} onSelectPage={() => undefined} />

      <div className="mx-4 mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-safe">
        <div
          className={
            compact
              ? "flex shrink-0 flex-col rounded-3xl border border-[#efefef] bg-white px-5 py-5"
              : "flex min-h-0 flex-col rounded-3xl border border-[#efefef] bg-white px-6 py-6"
          }
        >
          {children}
        </div>
        {showLegalFooter ? <AuthMobileLegalFooter /> : null}
        <AuthMobileBrandFooter className="mt-auto" />
      </div>
    </div>
  )
}

export function AuthMobileCardHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div>
      <p className="font-heading text-[20px] font-bold tracking-tight text-[#111111]">{title}</p>
      <p className="mt-0.5 text-[12.5px] text-[#a0a0a0]">{subtitle}</p>
    </div>
  )
}
