"use client"

import { ChevronLeft } from "lucide-react"

export const BRAND_HERO_HEIGHT_PX = 212

export const SIGN_IN_BRAND_PAGES = [
  {
    brandSub: "Your server, your control.",
    brandDesc:
      "Manage files, stream media, and keep tabs on your self-hosted Arciin instance from your phone—libraries, uploads, and activity stay in sync with the server you own.",
  },
  {
    brandSub: "Set up a new device.",
    brandDesc:
      "Link this phone to your Arciin server with your network address, a connection code from Settings → Mobile connection, and the same email and password you use on the web app.",
  },
] as const

const heroShellStyle = {
  background: "linear-gradient(155deg, #ff6a30 0%, #c82d00 100%)",
  height: BRAND_HERO_HEIGHT_PX,
  minHeight: BRAND_HERO_HEIGHT_PX,
} as const

function ArciinMark() {
  return (
    <span
      className="shrink-0 text-[38px] font-black leading-none tracking-tight text-white"
      style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
    >
      Arciin<span style={{ color: "rgba(255,255,255,0.36)" }}>.</span>
    </span>
  )
}

export function BrandHeroCarousel({
  activePage,
  onSelectPage,
}: {
  activePage: 0 | 1
  onSelectPage: (page: 0 | 1) => void
}) {
  return (
    <div
      className="mx-4 mt-3 shrink-0 overflow-hidden rounded-3xl"
      style={heroShellStyle}
    >
      <div className="flex h-full flex-col px-6 pt-7">
        <ArciinMark />

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

        <div className="flex shrink-0 items-center gap-[7px] pb-5 pt-3">
          {SIGN_IN_BRAND_PAGES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectPage(i as 0 | 1)}
              style={{
                width: activePage === i ? 22 : 7,
                height: 7,
                borderRadius: 99,
                transition: "width 0.25s, background-color 0.25s",
                backgroundColor: activePage === i ? "#ffffff" : "rgba(255,255,255,0.32)",
              }}
              aria-label={i === 0 ? "Sign in" : "Set up device"}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function BrandHeroStatic({
  title,
  description,
  onBack,
}: {
  title: string
  description: string
  onBack: () => void
}) {
  return (
    <div className="mx-4 mt-3 shrink-0 overflow-hidden rounded-3xl" style={heroShellStyle}>
      <div className="flex h-full flex-col px-6 pt-7">
        <ArciinMark />

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="flex w-fit shrink-0 items-center gap-1 text-[12px] font-medium text-white/70 active:text-white"
          >
            <ChevronLeft className="size-3.5" />
            Back to sign in
          </button>
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
