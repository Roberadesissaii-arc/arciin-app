"use client"

import { useEffect, type RefObject } from "react"

/**
 * Pins the chat shell to visualViewport (iOS/Android keyboard).
 * Avoids pushing the composer to the wrong place via bottom offsets on <html>.
 */
export function useChatViewport(pageRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (typeof window === "undefined") return

    const root = pageRef.current
    if (!root) return

    const vv = window.visualViewport

    const apply = () => {
      if (!pageRef.current) return
      if (vv) {
        pageRef.current.style.top = `${vv.offsetTop}px`
        pageRef.current.style.height = `${vv.height}px`
      } else {
        pageRef.current.style.top = "0px"
        pageRef.current.style.height = `${window.innerHeight}px`
      }
    }

    apply()

    vv?.addEventListener("resize", apply)
    vv?.addEventListener("scroll", apply)
    window.addEventListener("resize", apply)

    const onFocusOut = () => {
      window.setTimeout(apply, 80)
    }
    root.addEventListener("focusout", onFocusOut, true)

    return () => {
      vv?.removeEventListener("resize", apply)
      vv?.removeEventListener("scroll", apply)
      window.removeEventListener("resize", apply)
      root.removeEventListener("focusout", onFocusOut, true)
      if (pageRef.current) {
        pageRef.current.style.removeProperty("top")
        pageRef.current.style.removeProperty("height")
      }
    }
  }, [pageRef])
}
