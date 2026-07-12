"use client"

import { ChevronLeft } from "lucide-react"

import { AuthMobileHeroHeader } from "@/components/auth/auth-mobile-branding"

export const BRAND_HERO_HEIGHT_PX = 212

export const SIGN_IN_BRAND_PAGES = [
  {
    brandSub: "Your files, your phone.",
    brandDesc:
      "Arciin on mobile — upload photos and files, browse libraries, chat with your instance, and manage everything from one app.",
  },
  {
    brandSub: "Connect to your server.",
    brandDesc:
      "Arciin Mobile is a client — enter your server address, sign in, and manage files. Setup and storage live on your Arciin server, not on this phone.",
  },
] as const

const heroShellStyle = {
  background: "linear-gradient(155deg, #ff6a30 0%, #c82d00 100%)",
  height: BRAND_HERO_HEIGHT_PX,
  minHeight: BRAND_HERO_HEIGHT_PX,
} as const

export function BrandHeroCarousel({
  activePage,
  onSelectPage,
}: {
  activePage: 0 | 1
  onSelectPage: (page: 0 | 1) => void
}) {
  void onSelectPage

  return (
    <div
      className="mx-4 mt-3 shrink-0 overflow-hidden rounded-3xl"
      style={heroShellStyle}
    >
      <div className="flex h-full flex-col px-6 pt-7">
        <AuthMobileHeroHeader />

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5">
          <p
            className="shrink-0 text-[13px] font-semibold leading-snug"
            style={{ color: "rgba(255,255,255,0.78)" }}
          >
            {SIGN_IN_BRAND_PAGES[activePage].brandSub}
          </p>
          <p
            className="min-h-[72px] flex-1 text-[12.5px] leading-[1.55]"
            style={{ color: "rgba(255,255,255,0.5)", maxWidth: 320 }}
          >
            {SIGN_IN_BRAND_PAGES[activePage].brandDesc}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-[7px] pb-5 pt-3" aria-hidden>
          <div
            style={{
              width: 22,
              height: 7,
              borderRadius: 99,
              backgroundColor: "#ffffff",
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function BrandHeroStatic({
  title,
  description,
  onBack,
  backLabel = "Back to sign in",
  showBack = true,
}: {
  title: string
  description: string
  onBack?: () => void
  backLabel?: string
  showBack?: boolean
}) {
  return (
    <div className="mx-4 mt-3 shrink-0 overflow-hidden rounded-3xl" style={heroShellStyle}>
      <div className="flex h-full flex-col px-6 pt-7">
        <AuthMobileHeroHeader />

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5">
          {showBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex w-fit shrink-0 items-center gap-1 text-[12px] font-medium text-white/70 active:text-white"
            >
              <ChevronLeft className="size-3.5" />
              {backLabel}
            </button>
          ) : null}
          <p
            className="shrink-0 text-[13px] font-semibold leading-snug"
            style={{ color: "rgba(255,255,255,0.78)" }}
          >
            {title}
          </p>
          <p
            className="min-h-[72px] flex-1 text-[12.5px] leading-[1.55]"
            style={{ color: "rgba(255,255,255,0.5)", maxWidth: 320 }}
          >
            {description}
          </p>
        </div>

        <div className="shrink-0 pb-5 pt-3" aria-hidden>
          <div className="h-[7px]" />
        </div>
      </div>
    </div>
  )
}
