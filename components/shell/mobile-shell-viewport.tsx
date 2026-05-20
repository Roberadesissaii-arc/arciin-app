"use client"

import { usePathname } from "next/navigation"

import { BottomNav } from "@/components/shell/bottom-nav"
import { MobileTopChrome } from "@/components/shell/mobile-top-chrome"
import { ServerReconnectBanner } from "@/components/shell/server-reconnect-banner"
import { cn } from "@/lib/utils"

/**
 * iOS PWA shell: natural page scroll, fixed top chrome, floating bottom nav.
 */
export function MobileShellViewport({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/")

  return (
    <div className="mobile-app-root flex min-h-dvh flex-col bg-[#f7f7f7]">
      <MobileTopChrome />

      <main
        className={cn(
          "mobile-app-main flex-1 scrollbar-hide",
          isChat ? "px-0 pt-0 pb-0" : "px-4 pt-4 pb-nav-safe",
        )}
      >
        <div
          className={cn(
            "mobile-app-content flex flex-col",
            isChat ? "min-h-0 flex-1 gap-0" : "gap-4",
          )}
        >
          {!isChat ? <ServerReconnectBanner /> : null}
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
