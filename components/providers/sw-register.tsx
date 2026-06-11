"use client"

import { useEffect } from "react"

export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    // Service workers only register in a secure context (HTTPS, or localhost/127.0.0.1).
    // Over plain HTTP on a LAN IP (http://192.168.x.x:3002) the browser blocks it, so
    // offline caching is unavailable there. Skip cleanly and leave a hint rather than
    // letting a rejected promise look like a real error.
    if (!window.isSecureContext) {
      console.info(
        "[arciin] Offline PWA caching is disabled on this origin — it needs HTTPS (or localhost). Use a tunnel/reverse proxy for full PWA support over the network.",
      )
      return
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])
  return null
}
