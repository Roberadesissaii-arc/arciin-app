"use client"

import { usePathname } from "next/navigation"
import { Loader2, Plus, RefreshCw } from "lucide-react"

import { useModelsChromeOptional } from "@/components/models/models-chrome-context"
import { MODELS_FILTERS } from "@/lib/models/filter-config"
import {
  mobilePageSubtitleClass,
  mobilePageTitleClass,
  mobilePageTitleStyle,
} from "@/lib/ui/mobile-page-header"
import { cn } from "@/lib/utils"

export function ModelsMobileHeader() {
  const pathname = usePathname()
  const ctx = useModelsChromeOptional()

  if (pathname !== "/models" && !pathname.startsWith("/models/")) return null

  const chrome = ctx?.chrome

  return (
    <header className="z-40 shrink-0 border-b border-[#e5e5e5] bg-[#f7f7f7] pt-safe">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={mobilePageTitleClass} style={mobilePageTitleStyle}>
              Models
            </h2>
            <p className={mobilePageSubtitleClass}>{chrome?.subtitle ?? "Loading…"}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => chrome?.onRefresh()}
              disabled={!chrome || chrome.loading}
              className="flex size-9 items-center justify-center rounded-xl bg-white text-[#717171] active:opacity-70 disabled:opacity-40"
              style={{ border: "1px solid #e5e5e5" }}
              aria-label="Refresh"
            >
              {chrome?.refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => chrome?.onAddProvider()}
              disabled={!chrome || chrome.loading || !chrome.serverOnline}
              className="btn-accent-solid flex size-9 items-center justify-center rounded-xl active:opacity-80 disabled:opacity-50"
              aria-label="Add AI provider"
            >
              <Plus className="size-[16px]" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex w-max gap-2 pb-0.5">
            {MODELS_FILTERS.map(({ id, label, icon: Icon }) => {
              const active = chrome?.filter === id
              const count =
                chrome && id === "connected"
                  ? chrome.connectedCount
                  : chrome && id === "not-connected"
                    ? chrome.totalCount - chrome.connectedCount
                    : null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => chrome?.onChangeFilter(id)}
                  disabled={!chrome}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-2xl border py-2 pl-3.5 pr-3 text-[12px] font-semibold transition-colors active:opacity-70 disabled:opacity-50",
                    active
                      ? "chip-accent-active"
                      : "border-[#e5e5e5] bg-white text-[#717171]",
                  )}
                >
                  <Icon className="size-[13px] shrink-0" />
                  {label}
                  {count !== null && (id === "connected" || count > 0) ? (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                        active ? "bg-white/20 text-white" : "bg-[#f7f7f7] text-[#222222]",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}
