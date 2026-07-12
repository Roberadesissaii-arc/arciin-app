"use client"

import { Lock } from "lucide-react"

import { PlanBadge } from "@/components/shell/plan-badge"

/**
 * Plan-gated feature notice — styled like the app's native empty-state
 * placeholders (dashed border, floating on the page background).
 */
export function PlanGateCard({
  featureLabel,
  plan,
}: {
  featureLabel: string
  plan: string
}) {
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase()

  return (
    <div
      className="rounded-2xl bg-white px-4 py-14 text-center"
      style={{ border: "1px dashed #e5e5e5" }}
    >
      <Lock className="mx-auto mb-3 size-8 text-[#e5e5e5]" aria-hidden />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <p className="text-[13px] font-medium text-[#222222]">Unlock {featureLabel}</p>
        <PlanBadge plan={plan} />
      </div>
      <p className="mx-auto mt-1 max-w-[36ch] text-[12px] leading-relaxed text-[#a0a0a0]">
        Part of the {planLabel} plan. Activate a license on your server — your files stay
        free forever.
      </p>
      <p className="mt-3 text-[11px] text-[#c0c0c0]">
        Activate on desktop: Settings → License
      </p>
    </div>
  )
}
