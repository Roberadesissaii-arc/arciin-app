"use client"

import { usePathname } from "next/navigation"
import { ChevronRight, CloudUpload, FolderPlus, Loader2, RefreshCw } from "lucide-react"

import { useFilesChromeOptional } from "@/components/files/files-chrome-context"
import { FILES_FILTERS } from "@/lib/files/filter-config"
import {
  mobilePageSubtitleClass,
  mobilePageTitleClass,
  mobilePageTitleStyle,
} from "@/lib/ui/mobile-page-header"
import { cn } from "@/lib/utils"

/** Files top bar — shell sibling (outside scrolling main), same role as home search bar. */
export function FilesMobileHeader() {
  const pathname = usePathname()
  const ctx = useFilesChromeOptional()

  if (pathname !== "/files" && !pathname.startsWith("/files/")) return null

  const chrome = ctx?.chrome

  /* All-folders view has its own in-page header — do not show Files filters here */
  if (chrome?.view === "all-folders") {
    return null
  }

  return (
    <header className="z-40 shrink-0 border-b border-[#e5e5e5] bg-[#f7f7f7] pt-safe">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={mobilePageTitleClass} style={mobilePageTitleStyle}>
              Files
            </h2>
            <p className={mobilePageSubtitleClass}>{chrome?.subtitle ?? "Loading…"}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => chrome?.onRefresh()}
              disabled={!chrome || (chrome.loading && !chrome.hasCache)}
              className="flex size-11 items-center justify-center rounded-xl bg-white text-[#717171] active:opacity-70 disabled:opacity-40"
              style={{ border: "1px solid #e5e5e5" }}
              aria-label="Refresh"
            >
              <RefreshCw
                className={`size-4 ${chrome?.refreshing ? "animate-spin" : ""}`}
              />
            </button>
            {chrome?.canCreateFolder ? (
              <button
                type="button"
                onClick={() => chrome.onCreateFolder()}
                disabled={!chrome}
                className="flex size-11 items-center justify-center rounded-xl bg-white text-[#717171] active:opacity-70 disabled:opacity-40"
                style={{ border: "1px solid #e5e5e5" }}
                aria-label="Create folder"
              >
                <FolderPlus className="size-4" />
              </button>
            ) : null}
            <button
              type="button"
              disabled={!chrome?.canUpload || chrome?.uploading}
              onClick={() => chrome?.onUpload()}
              className="btn-accent-solid flex size-11 items-center justify-center rounded-xl active:opacity-80 disabled:opacity-50"
              aria-label="Upload files"
            >
              {chrome?.uploading ? (
                <Loader2 className="size-[16px] animate-spin" />
              ) : (
                <CloudUpload className="size-[16px]" />
              )}
            </button>
          </div>
        </div>

        {chrome?.libraryScoped && chrome.currentFolderName && chrome.breadcrumbLibrary ? (
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => chrome.onGoToLibraryRoot()}
              className="text-accent font-semibold active:opacity-70"
            >
              {chrome.breadcrumbLibrary}
            </button>
            <ChevronRight className="size-3.5 text-[#c0c0c0]" />
            <span className="truncate font-medium text-[#222222]">{chrome.currentFolderName}</span>
          </div>
        ) : null}

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex w-max gap-2 pb-0.5">
            {FILES_FILTERS.map(({ id, label, icon: Icon }) => {
              const active = chrome?.filter === id
              const count = chrome?.filterAssetCounts?.[id] ?? null
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => chrome?.onChangeFilter(id)}
                  disabled={!chrome}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border py-2 pl-3.5 pr-3 text-[12px] font-semibold transition-colors active:opacity-70 disabled:opacity-50",
                    active
                      ? "chip-accent-active"
                      : "border-[#e5e5e5] bg-white text-[#717171]",
                  )}
                >
                  <Icon className="size-[13px] shrink-0" />
                  {label}
                  {count !== null && count > 0 ? (
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
