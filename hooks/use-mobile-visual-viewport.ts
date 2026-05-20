"use client"

import { useEffect } from "react"

/**
 * Pins the mobile PWA shell to window.visualViewport (iOS/Android soft keyboard).
 * Sets CSS variables on <html> so bottom nav, chat composer, and scroll stay stable.
 */
export function useMobileVisualViewport() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const root = document.documentElement
    const vv = window.visualViewport

    const apply = () => {
      if (!vv) {
        root.style.setProperty("--vv-height", `${window.innerHeight}px`)
        root.style.setProperty("--vv-offset-top", "0px")
        root.style.setProperty("--keyboard-inset", "0px")
        root.removeAttribute("data-keyboard-open")
        return
      }

      const height = Math.round(vv.height)
      const offsetTop = Math.round(vv.offsetTop)
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))

      root.style.setProperty("--vv-height", `${height}px`)
      root.style.setProperty("--vv-offset-top", `${offsetTop}px`)
      root.style.setProperty("--keyboard-inset", `${inset}px`)

      if (inset > 48) {
        root.setAttribute("data-keyboard-open", "")
      } else {
        root.removeAttribute("data-keyboard-open")
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0)
        }
      }
    }

    const scheduleApply = () => {
      apply()
      requestAnimationFrame(apply)
      window.setTimeout(apply, 50)
      window.setTimeout(apply, 200)
      window.setTimeout(apply, 450)
    }

    apply()

    vv?.addEventListener("resize", apply)
    vv?.addEventListener("scroll", apply)
    window.addEventListener("resize", apply)
    document.addEventListener("focusin", scheduleApply, true)
    document.addEventListener("focusout", scheduleApply, true)

    return () => {
      vv?.removeEventListener("resize", apply)
      vv?.removeEventListener("scroll", apply)
      window.removeEventListener("resize", apply)
      document.removeEventListener("focusin", scheduleApply, true)
      document.removeEventListener("focusout", scheduleApply, true)
      root.style.removeProperty("--vv-height")
      root.style.removeProperty("--vv-offset-top")
      root.style.removeProperty("--keyboard-inset")
      root.removeAttribute("data-keyboard-open")
    }
  }, [])
}
