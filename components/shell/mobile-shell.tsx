import { FilesChromeProvider } from "@/components/files/files-chrome-context"
import { BottomNav } from "@/components/shell/bottom-nav"
import { MobileTopChrome } from "@/components/shell/mobile-top-chrome"

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <FilesChromeProvider>
      <div className="mobile-app-shell flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#f7f7f7]">
        <MobileTopChrome />

        <main className="mobile-app-main min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-[#f7f7f7] px-4 pt-4 pb-nav-safe scrollbar-hide">
          <div className="flex flex-col gap-4">{children}</div>
        </main>

        <BottomNav />
      </div>
    </FilesChromeProvider>
  )
}
