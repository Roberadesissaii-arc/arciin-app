import { AuthMobileShell } from "@/components/auth/auth-mobile-shell"

/** Keeps hero + card chrome mounted while switching sign-in ↔ forgot password. */
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <AuthMobileShell>{children}</AuthMobileShell>
}
