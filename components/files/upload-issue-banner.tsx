"use client"

import Link from "next/link"
import { AlertCircle, CloudUpload } from "lucide-react"

import type { UploadUserMessage } from "@/lib/api/upload-errors"

type UploadIssueBannerProps = {
  issue: UploadUserMessage
  onRetry?: () => void
  onDismiss?: () => void
}

export function UploadIssueBanner({ issue, onRetry, onDismiss }: UploadIssueBannerProps) {
  return (
    <div className="server-offline-banner shadow-[0_1px_0_rgba(0,0,0,0.04)]" role="alert">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
        <div className="server-offline-banner__ring" />
      </div>
      <div className="server-offline-banner__panel">
        <div className="flex items-start gap-3.5 px-4 py-3.5">
          <div className="accent-icon-tile flex size-11 shrink-0 items-center justify-center rounded-2xl">
            {issue.settingsAction ? (
              <CloudUpload className="text-accent size-5" strokeWidth={1.75} aria-hidden />
            ) : (
              <AlertCircle className="text-accent size-5" strokeWidth={1.75} aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-tight text-[#222222]">{issue.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">{issue.detail}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {issue.settingsAction ? (
                <Link
                  href="/profile"
                  className="text-accent text-[12px] font-semibold underline-offset-2 hover:underline"
                >
                  Open Settings
                </Link>
              ) : null}
              {issue.retryable && onRetry ? (
                <button
                  type="button"
                  onClick={() => {
                    onDismiss?.()
                    onRetry()
                  }}
                  className="text-[12px] font-semibold text-[#444444]"
                >
                  Try again
                </button>
              ) : null}
              {!issue.retryable && onDismiss ? (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="text-[12px] font-semibold text-[#444444]"
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
