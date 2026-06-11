"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { forceResetMobileViewport, lockBodyScroll } from "@/lib/ui/scroll-lock"
import { notifyViewportReset } from "@/hooks/use-bottom-nav-viewport"
import { cn } from "@/lib/utils"

const BODY_SHEET_CLASS = "arciin-mobile-sheet-open"
const KEYBOARD_OPEN_THRESHOLD_PX = 20

function keyboardOverlapPx(): number {
  if (typeof window === "undefined") return 0
  const vv = window.visualViewport
  if (!vv) return 0
  const overlap = window.innerHeight - vv.height - vv.offsetTop
  if (overlap < KEYBOARD_OPEN_THRESHOLD_PX) return 0
  return Math.round(overlap)
}

/** Pin the sheet portal to the visible viewport (iOS keyboard-safe). */
/** Shrink the overlay to the visible viewport only while the soft keyboard is open. */
function useVisualViewportFrame(open: boolean, frameRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open || typeof window === "undefined") return

    const vv = window.visualViewport
    if (!vv) return

    const sync = () => {
      const frame = frameRef.current
      if (!frame) return

      const overlap = keyboardOverlapPx()
      if (overlap > 0) {
        frame.style.top = `${vv.offsetTop}px`
        frame.style.height = `${vv.height}px`
        frame.style.bottom = "auto"
      } else {
        frame.style.removeProperty("top")
        frame.style.removeProperty("height")
        frame.style.removeProperty("bottom")
      }
    }

    sync()
    vv.addEventListener("resize", sync)
    vv.addEventListener("scroll", sync)

    return () => {
      vv.removeEventListener("resize", sync)
      vv.removeEventListener("scroll", sync)
      const frame = frameRef.current
      frame?.style.removeProperty("top")
      frame?.style.removeProperty("height")
      frame?.style.removeProperty("bottom")
    }
  }, [open, frameRef])
}

function clearSheetKeyboardLift(shell: HTMLElement) {
  shell.style.removeProperty("transform")
  shell.style.removeProperty("transition")
  shell.style.removeProperty("--sheet-kb-fill")
}

/** Lift sheet + white filler above the soft keyboard (no gap showing page behind). */
function useSheetKeyboardLift(open: boolean, shellRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open || typeof window === "undefined") return

    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const shell = shellRef.current
      if (!shell) return

      const active = document.activeElement
      const typing =
        active instanceof HTMLElement &&
        shell.contains(active) &&
        active.matches("input, textarea, select")

      if (!typing) {
        clearSheetKeyboardLift(shell)
        return
      }

      const overlap = keyboardOverlapPx()
      if (overlap > 0) {
        shell.style.transition = "transform 120ms ease-out"
        shell.style.transform = `translateY(-${overlap}px)`
        shell.style.setProperty("--sheet-kb-fill", `${overlap}px`)
      } else {
        clearSheetKeyboardLift(shell)
      }
    }

    const scheduleUpdate = () => {
      requestAnimationFrame(update)
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        scheduleUpdate()
        notifyViewportReset()
      }, 80)
    }

    scheduleUpdate()
    vv.addEventListener("resize", scheduleUpdate)
    vv.addEventListener("scroll", scheduleUpdate)
    document.addEventListener("focusin", scheduleUpdate, true)
    document.addEventListener("focusout", onFocusOut, true)

    return () => {
      vv.removeEventListener("resize", scheduleUpdate)
      vv.removeEventListener("scroll", scheduleUpdate)
      document.removeEventListener("focusin", scheduleUpdate, true)
      document.removeEventListener("focusout", onFocusOut, true)
      const shell = shellRef.current
      if (shell) clearSheetKeyboardLift(shell)
    }
  }, [open, shellRef])
}

function useBodySheetLock(open: boolean) {
  useEffect(() => {
    if (!open) return
    document.body.classList.add(BODY_SHEET_CLASS)
    const unlock = lockBodyScroll()
    return () => {
      document.body.classList.remove(BODY_SHEET_CLASS)
      unlock()
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
  const frameRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useBodySheetLock(open)
  useVisualViewportFrame(open, frameRef)
  useSheetKeyboardLift(open, shellRef)

  useEffect(() => {
    if (open) return
    const id = window.setTimeout(() => {
      forceResetMobileViewport()
      notifyViewportReset()
    }, 0)
    return () => window.clearTimeout(id)
  }, [open])

  const handleClose = () => {
    forceResetMobileViewport()
    notifyViewportReset()
    onClose()
  }

  if (!mounted || !open) return null

  return createPortal(
    <div ref={frameRef} className={cn("fixed inset-0 overflow-hidden", OVERLAY_Z)} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-label="Close backdrop"
      />
      <div ref={shellRef} className="absolute inset-x-0 bottom-0 z-10 flex max-h-full flex-col justify-end">
        {children}
        <div className="mobile-sheet-kb-fill bg-white" aria-hidden />
      </div>
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
  const frameRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useBodySheetLock(open)
  useVisualViewportFrame(open, frameRef)
  useSheetKeyboardLift(open, shellRef)

  useEffect(() => {
    if (open) return
    const id = window.setTimeout(() => {
      forceResetMobileViewport()
      notifyViewportReset()
    }, 0)
    return () => window.clearTimeout(id)
  }, [open])

  const handleClose = () => {
    const shell = shellRef.current
    const active = document.activeElement
    if (shell && active instanceof HTMLElement && shell.contains(active)) {
      active.blur()
    }
    forceResetMobileViewport()
    notifyViewportReset()
    onClose()
  }

  if (!mounted || !open) return null

  const hasHeader = Boolean(title || description)

  return createPortal(
    <div ref={frameRef} className={cn("fixed inset-0 overflow-hidden", OVERLAY_Z)} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-label="Close backdrop"
      />
      <div ref={shellRef} className="absolute inset-x-0 bottom-0 z-10 flex flex-col">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel ?? title}
          className={cn(
            PANEL_BASE,
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
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
                onClick={handleClose}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[#717171] active:bg-[#f7f7f7]"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={handleClose}
                className="flex size-11 items-center justify-center rounded-xl text-[#717171] active:bg-[#f7f7f7]"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          <div
            data-scroll-lock-allow
            className={cn(
              "scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain",
              hasHeader ? "px-5 py-4" : "px-5 pb-5 pt-10",
            )}
          >
            {children}
          </div>
        </div>
        <div className="mobile-sheet-kb-fill bg-white" aria-hidden />
      </div>
    </div>,
    document.body,
  )
}
