"use client"

import { useEffect } from "react"

/** Sets --keyboard-inset on <html> from visualViewport (iOS/Android soft keyboard). */
export function useKeyboardInset(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`)
    }

    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      document.documentElement.style.removeProperty("--keyboard-inset")
    }
  }, [enabled])
}
