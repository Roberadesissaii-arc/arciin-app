"use client"

import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"

import { BrandHeroStatic } from "@/components/auth/brand-hero"

function GhostButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[46px] w-full items-center justify-center rounded-2xl text-[14px] font-medium text-[#717171] transition-colors active:bg-[#f0f0f0]"
      style={{ border: "1.5px solid #e8e8e8" }}
    >
      {label}
    </button>
  )
}

export function ForgotPasswordPage() {
  const router = useRouter()

  return (
    <div
      className="flex min-h-[100dvh] flex-col pt-safe pb-safe"
      style={{ backgroundColor: "#f7f7f7" }}
    >
      <BrandHeroStatic
        title="Reset password"
        description="Request a reset link for your Arciin account on this server. Password reset from the mobile app is coming soon — use the web app on your server to manage your account for now."
        onBack={() => router.push("/sign-in")}
      />

      <div className="mx-4 mt-3 mb-6 shrink-0">
        <div
          className="rounded-3xl bg-white px-6 pt-6 pb-6"
          style={{ border: "1px solid #efefef" }}
        >
          <div className="mt-0 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5 opacity-50">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
                Email
              </label>
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ backgroundColor: "#f7f7f7", border: "1.5px solid #e8e8e8" }}
              >
                <Mail className="size-[16px] shrink-0 text-[#c0c0c0]" />
                <input
                  disabled
                  type="email"
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-[#222222] outline-none placeholder-[#c0c0c0]"
                />
              </div>
            </div>

            <button
              type="button"
              disabled
              className="flex h-[52px] w-full items-center justify-center rounded-2xl text-[15px] font-semibold text-white opacity-50"
              style={{
                background: "linear-gradient(135deg, #ff6a30 0%, #cc2e00 100%)",
              }}
            >
              Send reset link
            </button>

            <GhostButton label="Back to sign in" onClick={() => router.push("/sign-in")} />
          </div>
        </div>
      </div>
    </div>
  )
}
