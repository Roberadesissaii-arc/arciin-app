"use client"

import { useEffect } from "react"

/** Fires when the PWA returns to the foreground (tab visible / window focus). */
export function useAppForeground(onForeground: () => void) {
  useEffect(() => {
    const run = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return
      }
      onForeground()
    }

    document.addEventListener("visibilitychange", run)
    window.addEventListener("focus", run)
    window.addEventListener("pageshow", run)

    return () => {
      document.removeEventListener("visibilitychange", run)
      window.removeEventListener("focus", run)
      window.removeEventListener("pageshow", run)
    }
  }, [onForeground])
}

export const ARCIIN_FOREGROUND_EVENT = "arciin:foreground"

export function dispatchAppForeground() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(ARCIIN_FOREGROUND_EVENT))
}
