"use client"

import { usePathname } from "next/navigation"

import { ChatMobileHeader } from "@/components/chat/chat-mobile-header"
import { FilesMobileHeader } from "@/components/files/files-mobile-header"
import { ModelsMobileHeader } from "@/components/models/models-mobile-header"
import { MobileHeader } from "@/components/shell/mobile-header"

/** Sticky top chrome (home search bar, files library bar, models bar) — stays put while the page scrolls. */
export function MobileTopChrome() {
  const pathname = usePathname()

  if (pathname === "/home") {
    return (
      <div className="sticky top-0 z-40 shrink-0">
        <MobileHeader />
      </div>
    )
  }

  if (pathname === "/files" || pathname.startsWith("/files/")) {
    return (
      <div className="sticky top-0 z-40 shrink-0">
        <FilesMobileHeader />
      </div>
    )
  }

  if (pathname === "/models" || pathname.startsWith("/models/")) {
    return (
      <div className="sticky top-0 z-40 shrink-0">
        <ModelsMobileHeader />
      </div>
    )
  }

  if (pathname === "/chat" || pathname.startsWith("/chat/")) {
    return (
      <>
        <div className="shrink-0 pt-safe" style={{ height: "3.25rem" }} aria-hidden />
        <ChatMobileHeader />
      </>
    )
  }

  return <div className="shrink-0 bg-[#f7f7f7] pt-safe" aria-hidden />
}
