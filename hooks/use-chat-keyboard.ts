"use client"

import { useEffect, type RefObject } from "react"

import { resetMobileViewport } from "@/lib/ui/scroll-lock"

const KEYBOARD_OPEN_THRESHOLD_PX = 20

function keyboardOverlapPx(): number {
  if (typeof window === "undefined") return 0
  const vv = window.visualViewport
  if (!vv) return 0
  const overlap = window.innerHeight - vv.height - vv.offsetTop
  if (overlap < KEYBOARD_OPEN_THRESHOLD_PX) return 0
  return Math.round(overlap)
}

function clearComposerLift(root: HTMLElement, composer: HTMLElement) {
  composer.style.removeProperty("transform")
  composer.style.removeProperty("transition")
  root.removeAttribute("data-keyboard-open")
}

function applyComposerLift(root: HTMLElement, composer: HTMLElement) {
  const active = document.activeElement
  const typing =
    active instanceof HTMLElement &&
    root.contains(active) &&
    active.matches("textarea, input, [contenteditable='true']")

  if (!typing) {
    clearComposerLift(root, composer)
    return
  }

  const overlap = keyboardOverlapPx()
  if (overlap > 0) {
    composer.style.transition = "transform 120ms ease-out"
    composer.style.transform = `translateY(-${overlap}px)`
    root.setAttribute("data-keyboard-open", "")
  } else {
    clearComposerLift(root, composer)
  }
}

/** Snap chat composer to the bottom — same reset pattern as folder sheets. */
export function forceResetChatKeyboard(
  root: HTMLElement | null,
  composer: HTMLElement | null,
) {
  if (composer) {
    composer.style.removeProperty("transform")
    composer.style.removeProperty("transition")
  }
  root?.removeAttribute("data-keyboard-open")
  resetMobileViewport(0)

  const reclear = () => {
    composer?.style.removeProperty("transform")
    composer?.style.removeProperty("transition")
    root?.removeAttribute("data-keyboard-open")
  }
  requestAnimationFrame(reclear)
  window.setTimeout(reclear, 80)
  window.setTimeout(reclear, 150)
  window.setTimeout(reclear, 300)
}

/**
 * Lifts the fixed chat composer while the textarea is focused — mirrors MobileBottomSheet keyboard lift.
 */
export function useChatKeyboard(
  rootRef: RefObject<HTMLElement | null>,
  composerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const root = rootRef.current
    const composer = composerRef.current
    if (!root || !composer || typeof window === "undefined") return

    const vv = window.visualViewport

    const scheduleUpdate = () => {
      requestAnimationFrame(() => {
        if (!rootRef.current || !composerRef.current) return
        applyComposerLift(rootRef.current, composerRef.current)
      })
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        scheduleUpdate()
        if (keyboardOverlapPx() === 0 && rootRef.current && composerRef.current) {
          forceResetChatKeyboard(rootRef.current, composerRef.current)
        }
      }, 80)
      window.setTimeout(() => {
        if (keyboardOverlapPx() === 0 && rootRef.current && composerRef.current) {
          forceResetChatKeyboard(rootRef.current, composerRef.current)
        }
      }, 320)
    }

    scheduleUpdate()

    vv?.addEventListener("resize", scheduleUpdate)
    vv?.addEventListener("scroll", scheduleUpdate)
    root.addEventListener("focusin", scheduleUpdate, true)
    root.addEventListener("focusout", onFocusOut, true)

    return () => {
      vv?.removeEventListener("resize", scheduleUpdate)
      vv?.removeEventListener("scroll", scheduleUpdate)
      root.removeEventListener("focusin", scheduleUpdate, true)
      root.removeEventListener("focusout", onFocusOut, true)
      if (rootRef.current && composerRef.current) {
        clearComposerLift(rootRef.current, composerRef.current)
      }
    }
  }, [rootRef, composerRef])
}

export function syncChatKeyboardOffset(
  root: HTMLElement | null,
  composer: HTMLElement | null,
) {
  if (!root || !composer) return
  applyComposerLift(root, composer)
}
