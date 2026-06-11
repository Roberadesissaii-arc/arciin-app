"use client"

import Image from "next/image"
import { Check, CheckCircle2, Loader2, Settings2, Star } from "lucide-react"

import type { ProviderMeta } from "@/lib/models/provider-catalog"
import { isProviderConnected } from "@/lib/models/model-helpers"
import type { ModelProfile } from "@/lib/types/models"
import { cn } from "@/lib/utils"

export function MobileProviderCard({
  meta,
  profile,
  isActive,
  isBusy,
  onUse,
  onConnect,
  onConfigure,
  serverOnline = true,
}: {
  meta: ProviderMeta
  profile: ModelProfile | undefined
  isActive: boolean
  isBusy: boolean
  serverOnline?: boolean
  onUse: () => void
  onConnect: () => void
  onConfigure: () => void
}) {
  const connected = isProviderConnected(profile, meta)

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-2xl bg-white text-left"
      style={{
        border: isActive
          ? "2px solid var(--arciin-accent, #ff4f12)"
          : "1px solid #e5e5e5",
        boxShadow: isActive
          ? "0 4px 20px var(--arciin-accent-ring, rgba(255, 79, 18, 0.12))"
          : undefined,
      }}
    >
      <button
        type="button"
        disabled={Boolean(isBusy) || (!connected && !serverOnline)}
        onClick={() => {
          if (!connected && !serverOnline) return
          if (connected) onUse()
          else onConnect()
        }}
        className="flex flex-col text-left active:opacity-95 disabled:opacity-70"
      >
        <div className="flex items-start justify-between gap-3 p-4 pb-2">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={
                meta.logoBg
                  ? { background: meta.logoBg, border: "1px solid #e5e5e5" }
                  : meta.logoInvert
                    ? { background: "#18181b", border: "1px solid #3f3f46" }
                    : { background: "#f7f7f7", border: "1px solid #e5e5e5" }
              }
            >
              <Image src={meta.logo} alt="" width={26} height={26} className="size-[26px] object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[14px] font-semibold text-[#222222]">{meta.name}</p>
                {meta.badge ? (
                  <span
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#717171]"
                    style={{ border: "1px solid #e5e5e5" }}
                  >
                    {meta.badge}
                  </span>
                ) : null}
                {profile?.isDefault ? (
                  <Star className="text-accent size-3.5 fill-current" />
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: connected ? "#22c55e" : "#d4d4d8",
                    boxShadow: connected ? "0 0 5px #22c55e80" : undefined,
                  }}
                />
                <p className="truncate text-[11px] text-[#717171]">
                  {connected ? profile?.defaultModel ?? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
          </div>
          {isBusy ? (
            <Loader2 className="text-accent size-5 shrink-0 animate-spin" />
          ) : isActive ? (
            <Check className="text-accent size-5 shrink-0" />
          ) : connected ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
          ) : null}
        </div>

        <p className="px-4 pb-3 text-[12px] leading-relaxed text-[#717171]">{meta.description}</p>

        {meta.suggestedModels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {meta.suggestedModels.slice(0, 3).map((m) => (
              <span
                key={m}
                className="rounded-lg bg-[#f7f7f7] px-2 py-0.5 font-mono text-[10px] text-[#717171]"
                style={{ border: "1px solid #e5e5e5" }}
              >
                {m}
              </span>
            ))}
          </div>
        ) : null}
      </button>

      <div className="flex items-center gap-2 border-t border-[#f0f0f0] px-4 py-2.5">
        {connected ? (
          <>
            <button
              type="button"
              onClick={onUse}
              disabled={isBusy || !serverOnline}
              className={cn(
                "flex-1 rounded-xl py-2 text-[12px] font-semibold text-white disabled:opacity-50",
                isActive ? "btn-accent-solid" : "bg-[#222222]",
              )}
            >
              {isActive ? "Active for chat" : "Use for chat"}
            </button>
            <button
              type="button"
              onClick={onConfigure}
              disabled={isBusy || !serverOnline}
              className="flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-medium text-[#717171] active:bg-[#f7f7f7] disabled:opacity-50"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <Settings2 className="size-3.5" />
              Edit
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            disabled={!serverOnline}
            className={cn(
              "w-full rounded-xl py-2.5 text-[12px] font-semibold text-white active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
              serverOnline ? "btn-accent-solid" : "bg-[#d4d4d4]",
            )}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  )
}
