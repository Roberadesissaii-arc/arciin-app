import { DesktopUnavailable } from "@/components/desktop-block/desktop-unavailable"

export default function MobileRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="hidden md:block">
        <DesktopUnavailable />
      </div>
      <div className="md:hidden min-h-dvh bg-[#f7f7f7]">{children}</div>
    </>
  )
}
