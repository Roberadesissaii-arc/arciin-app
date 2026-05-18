"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"

export function SignOutButton() {
  const router = useRouter()
  const { signOut } = useConnection()

  return (
    <button
      type="button"
      onClick={() => {
        signOut()
        router.replace("/sign-in")
      }}
      className="flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-[#f7f7f7]"
    >
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: "rgba(220,38,38,0.06)",
          border: "1px solid #e5e5e5",
        }}
      >
        <LogOut className="size-[15px] text-[#dc2626]" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[14px] font-medium text-[#dc2626]">Sign out</p>
        <p className="text-[11px] text-[#a0a0a0]">Disconnect this device</p>
      </div>
    </button>
  )
}
