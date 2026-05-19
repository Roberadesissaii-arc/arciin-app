"use client"

import { BottomNav } from "@/components/shell/bottom-nav"
import { MobileTopChrome } from "@/components/shell/mobile-top-chrome"
import { ServerReconnectBanner } from "@/components/shell/server-reconnect-banner"

/**
 * iOS PWA shell: natural page scroll, fixed top chrome, fixed bottom nav.
 * Safe-area padding lives inside the dark nav bar (no light band under the pill).
 */
export function MobileShellViewport({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-app-root flex min-h-dvh flex-col bg-[#f7f7f7]">
      <MobileTopChrome />

      <main className="mobile-app-main flex-1 px-4 pt-4 pb-nav-safe scrollbar-hide">
        <div className="mobile-app-content flex flex-col gap-4">
          <ServerReconnectBanner />
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
