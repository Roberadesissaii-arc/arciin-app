import { DesktopUnavailable } from "@/components/desktop-block/desktop-unavailable"

export default function MobileRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* lg (1024px): tablets in portrait and wide phones keep the mobile shell */}
      <div className="hidden lg:block">
        <DesktopUnavailable />
      </div>
      <div className="lg:hidden min-h-dvh bg-[#f7f7f7]">{children}</div>
    </>
  )
}
