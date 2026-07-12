"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link2, Loader2, X } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { importFromUrl } from "@/lib/api/imports"
import { formatApiError } from "@/lib/api/errors"
import { mobileInputClassMuted } from "@/lib/ui/mobile-input"
import { lockBodyScroll } from "@/lib/ui/scroll-lock"
import { detectAssetSource } from "@/lib/utils/asset-source"
import { sourceBrandIconSrc, sourceBrandIconTileBg } from "@/lib/utils/source-brand-icon"
import type { UploadSessionSummary } from "@/lib/types/assets"

const inputStyle = { border: "1px solid #e5e5e5" } as const

function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/** Brand logo (Facebook, YouTube, …) or a neutral link chip when no logo exists. */
function PreviewIcon({ sourceKey, color }: { sourceKey: string; color: string }) {
  const iconSrc = sourceBrandIconSrc(sourceKey)
  if (iconSrc) {
    return (
      <span
        className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg"
        style={{ backgroundColor: sourceBrandIconTileBg(sourceKey), border: "1px solid #e5e5e5" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt="" className="size-4.5 object-contain" />
      </span>
    )
  }
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
      style={{ backgroundColor: color }}
    >
      <Link2 className="size-4" />
    </span>
  )
}

export function MobileImportLinkSheet({
  open,
  libraryId,
  folderId,
  onClose,
  onImportStarted,
}: {
  open: boolean
  libraryId?: string | null
  folderId?: string | null
  onClose: () => void
  /** Fired after the server accepts the import — the page tracks progress inline. */
  onImportStarted: (session: UploadSessionSummary, sourceLabel: string) => void
}) {
  const { connection } = useConnection()
  const frameRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [url, setUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  // Centered modal (not a bottom sheet). We lock the page behind it and pin the
  // centering frame to the *visible* viewport via visualViewport — so it stays
  // vertically centered in whatever space is left, drifting up (never covered)
  // when the keyboard opens, and never scrolling/pushing the page behind it.
  useEffect(() => {
    if (!open) return
    const unlock = lockBodyScroll()

    const vv = typeof window !== "undefined" ? window.visualViewport : null
    const sync = () => {
      const frame = frameRef.current
      if (!frame || !vv) return
      frame.style.top = `${vv.offsetTop}px`
      frame.style.height = `${vv.height}px`
    }
    sync()
    vv?.addEventListener("resize", sync)
    vv?.addEventListener("scroll", sync)

    return () => {
      vv?.removeEventListener("resize", sync)
      vv?.removeEventListener("scroll", sync)
      unlock()
    }
  }, [open])

  const preview = useMemo(() => (looksLikeUrl(url) ? detectAssetSource(url.trim()) : null), [url])

  function reset() {
    setUrl("")
    setError(null)
  }

  function requestClose() {
    if (submitting) return
    reset()
    onClose()
  }

  async function handleSubmit() {
    const trimmed = url.trim()
    if (!connection || !looksLikeUrl(trimmed)) {
      setError("Enter a valid link starting with http:// or https://")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const session = await importFromUrl(connection, trimmed, {
        targetLibraryId: libraryId ?? undefined,
        targetFolderId: folderId ?? undefined,
      })
      const sourceLabel = preview?.label ?? "the link"
      reset()
      onClose()
      // No toast — the Files page shows an inline progress bar for the import.
      onImportStarted(session, sourceLabel)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={requestClose}
        aria-label="Close backdrop"
      />
      {/* Centered in the visible viewport (frameRef.top/height track it), so the
          modal stays centered and drifts up above the keyboard when it opens. */}
      <div
        ref={frameRef}
        className="absolute inset-x-0 top-0 flex items-center justify-center px-4"
        style={{ height: "100dvh" }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Import from link"
          className="pointer-events-auto max-h-full w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[16px] font-bold text-[#222222]">Import from link</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
                Paste a public link — YouTube, Instagram, TikTok, images, PDFs, or direct file URLs.
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#717171] active:bg-[#f7f7f7]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="import-link-url" className="text-[12px] font-semibold text-[#717171]">
                Link
              </label>
              <input
                id="import-link-url"
                type="url"
                inputMode="url"
                value={url}
                placeholder="https://…"
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleSubmit()
                  }
                }}
                className={mobileInputClassMuted}
                style={inputStyle}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}
            </div>

            {preview ? (
              <div
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                style={{ border: "1px solid #e5e5e5", background: "#f7f7f7" }}
              >
                <PreviewIcon sourceKey={preview.key} color={preview.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#222222]">
                    {preview.label}
                  </span>
                  <span className="block text-[11px] text-[#a0a0a0]">Detected from the link</span>
                </span>
              </div>
            ) : null}

            <button
              type="button"
              disabled={submitting || !looksLikeUrl(url)}
              onClick={() => void handleSubmit()}
              className="btn-accent-solid flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitting ? "Starting…" : preview ? `Import from ${preview.label}` : "Import the link"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
