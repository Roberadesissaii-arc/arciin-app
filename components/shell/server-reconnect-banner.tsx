"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"

export function ServerReconnectBanner() {
  const pathname = usePathname()
  const { connection, serverReachable } = useConnection()

  if (!connection || serverReachable !== false) return null
  if (pathname.startsWith("/sign-in")) return null

  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3"
      style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#b91c1c]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#991b1b]">Cannot reach your Arciin server</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#b91c1c]">
          Your tunnel may have expired (Cloudflare 530). Update the address under Profile → Remote access — you
          usually do not need to register this phone again.
        </p>
        <Link
          href="/profile"
          className="mt-2 inline-block text-[12px] font-semibold text-[#ff4f12] underline-offset-2"
        >
          Update server address
        </Link>
      </div>
    </div>
  )
}
