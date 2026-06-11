"use client"

import { ShieldAlert } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { isInstanceAdmin } from "@/lib/auth/instance-admin"

export function AdminOnlyNotice({ feature }: { feature: string }) {
  const { connection } = useConnection()
  const role = connection?.user?.role ?? "Member"

  return (
    <div
      className="flex gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3.5 py-3"
      role="status"
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#d97706]" />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#92400e]">Owner or admin only</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#a16207]">
          {feature} can only be changed by an instance owner or admin. You are signed in as{" "}
          <span className="font-semibold">{role}</span>. Ask an admin or use the desktop app with an
          admin account.
        </p>
      </div>
    </div>
  )
}

export function AdminSettingsGate({
  feature,
  children,
}: {
  feature: string
  children: React.ReactNode
}) {
  const { connection } = useConnection()
  if (!isInstanceAdmin(connection?.user?.role)) {
    return <AdminOnlyNotice feature={feature} />
  }
  return children
}
