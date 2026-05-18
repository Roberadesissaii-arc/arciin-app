"use client"

import { usePathname } from "next/navigation"

import { FilesMobileHeader } from "@/components/files/files-mobile-header"
import { MobileHeader } from "@/components/shell/mobile-header"

/** Fixed top chrome outside scrolling main (home search bar, files library bar). */
export function MobileTopChrome() {
  const pathname = usePathname()

  if (pathname === "/home") {
    return (
      <div className="shrink-0">
        <MobileHeader />
      </div>
    )
  }

  if (pathname === "/files" || pathname.startsWith("/files/")) {
    return (
      <div className="shrink-0">
        <FilesMobileHeader />
      </div>
    )
  }

  return <div className="shrink-0 bg-[#f7f7f7] pt-safe" aria-hidden />
}
