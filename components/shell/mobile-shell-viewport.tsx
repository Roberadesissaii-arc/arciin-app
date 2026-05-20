"use client"

import { usePathname } from "next/navigation"

import { BottomNav } from "@/components/shell/bottom-nav"
import { MobileTopChrome } from "@/components/shell/mobile-top-chrome"
import { ServerReconnectBanner } from "@/components/shell/server-reconnect-banner"
import { useMobileVisualViewport } from "@/hooks/use-mobile-visual-viewport"
import { cn } from "@/lib/utils"

/**
 * iOS PWA shell: pinned to visualViewport; main scrolls inside flex column (not document).
 */
export function MobileShellViewport({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/")

  useMobileVisualViewport()

  return (
    <div className="mobile-app-root">
      <MobileTopChrome />

      <main
        className={cn(
          "mobile-app-main flex-1 scrollbar-hide",
          isChat ? "px-0 pt-0 pb-0" : "px-4 pt-4 pb-2",
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
