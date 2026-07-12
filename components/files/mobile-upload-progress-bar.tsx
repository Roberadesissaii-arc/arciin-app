"use client"

import { CheckCircle2, CloudUpload, Loader2 } from "lucide-react"

type MobileUploadProgressBarProps = {
  mode: "picking" | "preparing" | "uploading" | "complete"
  count?: number
  label?: string | null
  percent?: number | null
  title?: string | null
  detail?: string | null
}

/** Inline upload status row at the top of the Files page (original placement). */
export function MobileUploadProgressBar({
  mode,
  count = 0,
  label,
  percent,
  title,
  detail,
}: MobileUploadProgressBarProps) {
  if (mode === "complete") {
    return (
      <div
        className="rounded-2xl bg-white px-4 py-3"
        style={{ border: "1px solid #e5e5e5" }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-[#22c55e]" />
          <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#222222]">
            {title?.trim() || "Upload complete"}
          </p>
        </div>
        {detail?.trim() ? (
          <p className="mt-1 truncate text-[11px] leading-relaxed text-[#717171]">{detail}</p>
        ) : null}
      </div>
    )
  }

  const heading =
    mode === "picking"
      ? count > 0
        ? `Reading ${count} selected files…`
        : "Waiting for your selection…"
      : mode === "preparing"
        ? count === 1
          ? "Preparing photo…"
          : `Preparing ${count} files…`
        : label?.trim() || "Uploading…"

  return (
    <div
      className="rounded-2xl bg-white px-4 py-3"
      style={{ border: "1px solid #e5e5e5" }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        {mode === "preparing" || mode === "picking" ? (
          <Loader2 className="text-accent size-4 shrink-0 animate-spin" />
        ) : (
          <CloudUpload className="text-accent size-4 shrink-0" />
        )}
        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#222222]">{heading}</p>
        {mode === "uploading" ? (
          <span className="text-[11px] font-semibold tabular-nums text-[#717171]">
            {percent ?? 0}%
          </span>
        ) : null}
      </div>
      {mode === "preparing" || mode === "picking" ? (
        <p className="mt-1 text-[11px] leading-relaxed text-[#717171]">
          {mode === "picking"
            ? "Keep Arciin open after tapping Done — large photo batches can take a moment on iPhone."
            : "Large selections can take a moment on iPhone. Upload starts automatically when ready."}
        </p>
      ) : (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#f0f0f0]">
          <div
            className="bg-accent h-full rounded-full transition-all"
            style={{ width: `${percent ?? 0}%` }}
          />
        </div>
      )}
    </div>
  )
}
