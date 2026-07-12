"use client"

import { useCallback } from "react"
import { Loader2, ShieldCheck } from "lucide-react"

import { PlanBadge } from "@/components/shell/plan-badge"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { getLicenseStatus } from "@/lib/api/license"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

function statusTone(status: string) {
  if (status === "active") return { label: "Active", cls: "bg-[#f0fdf4] text-[#15803d]" }
  if (status === "grace") return { label: "Grace period", cls: "bg-[#fffbeb] text-[#b45309]" }
  if (status === "expired") return { label: "Expired", cls: "bg-[#fef2f2] text-[#b91c1c]" }
  return { label: "Free core", cls: "bg-[#f7f7f7] text-[#717171]" }
}

/** Read-only license status for this server — activation happens on desktop. */
export function LicenseInlinePanel({ enabled }: { enabled: boolean }) {
  const loader = useCallback(
    (connection: Parameters<typeof getLicenseStatus>[0], signal: AbortSignal) =>
      getLicenseStatus(connection, signal),
    [],
  )

  const { data, loading, error } = useStablePanelLoad(enabled, loader, {
    cacheKey: "license-status",
    staleTimeMs: 60_000,
  })

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[#a0a0a0]">
        <Loader2 className="size-4 animate-spin" />
        Checking license…
      </div>
    )
  }

  if (error && !data) {
    return <MutedPanelError error={error} />
  }

  if (!data) return null

  const tone = statusTone(data.status)

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Plan hero */}
      <div className="rounded-2xl bg-[#f7f7f7] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[16px] font-bold text-[#222222]">{data.planName}</p>
          <PlanBadge plan={data.plan} />
          <span
            className={`ml-auto rounded-lg px-2 py-0.5 text-[11px] font-semibold ${tone.cls}`}
          >
            {tone.label}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#717171]">
          {data.planDescription}
        </p>
      </div>

      {/* Details */}
      <div className="divide-y divide-[#f0f0f0] rounded-2xl border border-[#ececec]">
        {[
          { label: "License key", value: data.keyPrefix ?? "—", mono: true },
          { label: "Renews / expires", value: formatDate(data.expiresAt) },
          {
            label: "Premium features",
            value: data.premiumActive ? "Enabled" : "Free core only",
          },
          {
            label: "Servers",
            value: data.servers
              ? `${data.servers.activated} / ${data.servers.limit === "custom" ? "Custom" : data.servers.limit}`
              : "—",
          },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 px-3.5 py-2.5"
          >
            <p className="text-[12px] font-medium text-[#a0a0a0]">{row.label}</p>
            <p
              className={`break-all text-right text-[12.5px] text-[#222222] ${row.mono ? "font-mono text-[12px]" : ""}`}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-2xl bg-[#f7f7f7] px-3.5 py-3">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0"
          style={{ color: "var(--arciin-accent, #ff4f12)" }}
          aria-hidden
        />
        <p className="text-[11.5px] leading-relaxed text-[#717171]">
          Activate or change the license from your desktop: Arciin → Settings → License. Your
          files stay accessible on Free — licensing never locks your data.
        </p>
      </div>
    </div>
  )
}
