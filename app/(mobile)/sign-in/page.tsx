import { Suspense } from "react"

import { SignInPage } from "@/components/auth/sign-in-page"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f7f7]">
          <span className="size-8 animate-spin rounded-full border-2 border-[#ff4f12]/30 border-t-[#ff4f12]" />
        </div>
      }
    >
      <SignInPage />
    </Suspense>
  )
}
