import type { UserPreferences } from "@/lib/types/models"

import { canonicalAccentHex } from "@/lib/preferences/accent-colors"
import { applyAccentTokens } from "@/lib/preferences/accent-tokens"
import { DEFAULT_USER_PREFERENCES } from "@/lib/preferences/defaults"

const FONT_PX: Record<string, string> = {
  Small: "13px",
  Normal: "15px",
  Large: "17px",
  "Extra Large": "19px",
}

const FONT_ZOOM: Record<string, string> = {
  Small: "0.88",
  Normal: "1",
  Large: "1.12",
  "Extra Large": "1.22",
}

const UI_RADIUS_PX: Record<string, string> = {
  comfortable: "0.625rem",
  compact: "0.5rem",
  sharp: "0.35rem",
}

function osPrefersReducedMotion() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function applyUserPreferences(preferences: UserPreferences) {
  if (typeof document === "undefined") return

  const { appearance, accessibility } = preferences
  const root = document.documentElement
  const reduceMotion = accessibility.reduceAnimations || osPrefersReducedMotion()
  const accent = canonicalAccentHex(appearance.accentColor)

  applyAccentTokens(accent)
  root.style.setProperty("--app-font-size", FONT_PX[accessibility.fontSize] ?? "15px")
  root.style.setProperty("--app-font-zoom", FONT_ZOOM[accessibility.fontSize] ?? "1")
  root.style.setProperty("--radius", UI_RADIUS_PX[appearance.uiRadius] ?? "0.625rem")

  root.dataset.a11yFont = accessibility.fontSize
  root.dataset.toastStyle = appearance.toastStyle
  root.dataset.toastPosition = appearance.toastPosition
  root.dataset.toastIcons = appearance.toastShowIcons ? "1" : "0"
  root.dataset.uiRadius = appearance.uiRadius

  root.classList.toggle("compact-view", appearance.compactView)
  root.classList.toggle("no-animated-cards", !appearance.animatedCards)
  root.classList.toggle("reduce-motion", reduceMotion)
  root.classList.toggle("high-contrast", accessibility.highContrast)
  root.classList.toggle("keyboard-nav", accessibility.keyboardNav)
  root.classList.toggle("toast-hide-icons", !appearance.toastShowIcons)

  const scaled = document.querySelector(".mobile-app-content")
  if (scaled instanceof HTMLElement) {
    const onChatPage = scaled.querySelector(".chat-page") != null
    // CSS zoom breaks chat safe-area layout and vertical centering on iOS PWA.
    scaled.style.zoom = onChatPage ? "1" : (FONT_ZOOM[accessibility.fontSize] ?? "1")
    scaled.style.fontSize = FONT_PX[accessibility.fontSize] ?? "15px"
  }
}

export function applyUserPreferencesDefaults() {
  applyUserPreferences(DEFAULT_USER_PREFERENCES)
}
