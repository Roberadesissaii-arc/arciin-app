import { DesktopUnavailable } from "@/components/desktop-block/desktop-unavailable"

export default function MobileRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="hidden md:block">
        <DesktopUnavailable />
      </div>
      <div className="md:hidden h-[100dvh] max-h-[100dvh] overflow-hidden">{children}</div>
    </>
  )
}
