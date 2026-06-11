"use client"

import { useEffect, type RefObject } from "react"

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

/** Keep the portaled bottom nav pinned to the real screen bottom after keyboard / sheets. */
export function useBottomNavViewport(navRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const vv = window.visualViewport
    if (!vv) return

    const sync = () => {
      const nav = navRef.current
      if (!nav) return

      const sheetOpen = document.body.classList.contains(BODY_SHEET_CLASS)
      const overlap = keyboardOverlapPx()

      if (sheetOpen || overlap > 0) {
        nav.style.visibility = "hidden"
        nav.style.pointerEvents = "none"
        return
      }

      nav.style.visibility = ""
      nav.style.pointerEvents = ""
      nav.style.removeProperty("bottom")
      nav.style.removeProperty("transform")
    }

    sync()
    vv.addEventListener("resize", sync)
    vv.addEventListener("scroll", sync)
    window.addEventListener("focusin", sync, true)
    window.addEventListener("focusout", sync, true)

    const onSheetClosed = () => {
      window.setTimeout(sync, 0)
      window.setTimeout(sync, 120)
      window.setTimeout(sync, 320)
    }
    window.addEventListener("arciin:viewport-reset", onSheetClosed)

    return () => {
      vv.removeEventListener("resize", sync)
      vv.removeEventListener("scroll", sync)
      window.removeEventListener("focusin", sync, true)
      window.removeEventListener("focusout", sync, true)
      window.removeEventListener("arciin:viewport-reset", onSheetClosed)
      const nav = navRef.current
      if (nav) {
        nav.style.removeProperty("visibility")
        nav.style.removeProperty("pointer-events")
        nav.style.removeProperty("bottom")
        nav.style.removeProperty("transform")
      }
    }
  }, [enabled, navRef])
}

export function notifyViewportReset() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event("arciin:viewport-reset"))
}
