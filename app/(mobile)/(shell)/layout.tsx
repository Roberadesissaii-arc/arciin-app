import { AuthGuard } from "@/components/auth/auth-guard"
import { MobileShell } from "@/components/shell/mobile-shell"

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <MobileShell>{children}</MobileShell>
    </AuthGuard>
  )
}
