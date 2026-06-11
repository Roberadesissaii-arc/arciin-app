/** True when running as an installed PWA (home screen / standalone display). */
export function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export function detectMobileInstallPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other"
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios"
  if (/Android/i.test(ua)) return "android"
  return "other"
}
