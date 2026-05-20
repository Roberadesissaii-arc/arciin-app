"use client"

import { useEffect, type RefObject } from "react"

function keyboardOffsetPx(): number {
  if (typeof window === "undefined") return 0
  const vv = window.visualViewport
  if (!vv) return 0
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
}

/**
 * Lifts the chat composer to sit flush on the soft keyboard (visualViewport only).
 * Chat-only — does not resize the app shell or bottom nav.
 */
export function useChatKeyboard(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof window === "undefined") return

    const vv = window.visualViewport

    const apply = () => {
      if (!rootRef.current) return
      const offset = keyboardOffsetPx()
      rootRef.current.style.setProperty("--chat-kb-offset", `${offset}px`)
      if (offset > 48) {
        rootRef.current.setAttribute("data-keyboard-open", "")
      } else {
        rootRef.current.removeAttribute("data-keyboard-open")
      }
    }

    apply()

    vv?.addEventListener("resize", apply)
    vv?.addEventListener("scroll", apply)
    window.addEventListener("resize", apply)

    const scheduleApply = () => {
      apply()
      requestAnimationFrame(apply)
      window.setTimeout(apply, 50)
      window.setTimeout(apply, 180)
      window.setTimeout(apply, 400)
    }

    root.addEventListener("focusin", scheduleApply, true)
    root.addEventListener("focusout", scheduleApply, true)

    return () => {
      vv?.removeEventListener("resize", apply)
      vv?.removeEventListener("scroll", apply)
      window.removeEventListener("resize", apply)
      root.removeEventListener("focusin", scheduleApply, true)
      root.removeEventListener("focusout", scheduleApply, true)
      if (rootRef.current) {
        rootRef.current.style.removeProperty("--chat-kb-offset")
        rootRef.current.removeAttribute("data-keyboard-open")
      }
    }
  }, [rootRef])
}

/** Call after blur/send so iOS PWA clears stale keyboard inset. */
export function syncChatKeyboardOffset(root: HTMLElement | null) {
  if (!root) return
  const offset = keyboardOffsetPx()
  root.style.setProperty("--chat-kb-offset", `${offset}px`)
  if (offset > 48) {
    root.setAttribute("data-keyboard-open", "")
  } else {
    root.removeAttribute("data-keyboard-open")
  }
}
