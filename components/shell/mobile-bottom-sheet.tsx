"use client"

import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const BODY_SHEET_CLASS = "arciin-mobile-sheet-open"

function useBodySheetLock(open: boolean) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.classList.add(BODY_SHEET_CLASS)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.classList.remove(BODY_SHEET_CLASS)
      document.body.style.overflow = prevOverflow
    }
  }, [open])
}

const OVERLAY_Z = "z-[200]"

type MobileOverlayProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

/** Full-screen backdrop; children are pinned to the viewport bottom. */
export function MobileOverlay({ open, onClose, children }: MobileOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useBodySheetLock(open)

  if (!mounted || !open) return null

  return createPortal(
    <div className={cn("fixed inset-0", OVERLAY_Z)} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close backdrop"
      />
      <div className="fixed inset-x-0 bottom-0 z-10">{children}</div>
    </div>,
    document.body,
  )
}

type MobileBottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  panelClassName?: string
  ariaLabel?: string
}

const PANEL_BASE =
  "pointer-events-auto flex max-h-[min(92dvh,800px)] w-full flex-col rounded-t-3xl bg-white shadow-[0_-12px_48px_rgba(0,0,0,0.18)]"

/** Bottom sheet portal — flush to screen bottom; tab bar stays behind overlay. */
export function MobileBottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  panelClassName,
  ariaLabel,
}: MobileBottomSheetProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useBodySheetLock(open)

  if (!mounted || !open) return null

  const hasHeader = Boolean(title || description)

  return createPortal(
    <div className={cn("fixed inset-0", OVERLAY_Z)} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className={cn(
          PANEL_BASE,
          "fixed inset-x-0 bottom-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          panelClassName,
        )}
        style={{ borderTop: "1px solid #e5e5e5" }}
      >
        {hasHeader ? (
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#f0f0f0] px-5 py-4">
            <div className="min-w-0">
              {title ? (
                <p className="text-[16px] font-bold text-[#222222]">{title}</p>
              ) : null}
              {description ? (
                <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[#717171] active:bg-[#f7f7f7]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="absolute right-3 top-3 z-10">
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-xl text-[#717171] active:bg-[#f7f7f7]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div
          className={cn(
            "scrollbar-hide min-h-0 flex-1 overflow-y-auto",
            hasHeader ? "px-5 py-4" : "px-5 pb-5 pt-10",
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
