import { canonicalAccentHex } from "@/lib/preferences/accent-colors"

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized
  const n = Number.parseInt(full, 16)
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  }
}

/** Solid rgba for gradients — more reliable than color-mix() inside var() on mobile WebKit. */
function accentAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Original profile hero ember (desktop login panel) — preserve when accent is Orange. */
const ORANGE_HERO_GLOW = {
  topWash: "rgba(255, 75, 51, 0.12)",
  glowBright: "rgba(255, 75, 51, 0.45)",
  glowMid: "rgba(255, 75, 51, 0.12)",
  glowSecondary: "rgba(255, 120, 90, 0.22)",
} as const

function isDefaultOrangeAccent(hex: string) {
  return hex.toLowerCase() === "#ff4f12"
}

/** Peach highlight ring — matches original secondary layer for non-orange accents. */
function heroSecondaryGlow(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const mix = 0.47
  const lr = Math.round(r + (255 - r) * mix)
  const lg = Math.round(g + (255 - g) * mix)
  const lb = Math.round(b + (255 - b) * mix)
  return `rgba(${lr}, ${lg}, ${lb}, 0.22)`
}

function heroGlowTokens(resolved: string) {
  if (isDefaultOrangeAccent(resolved)) {
    return { ...ORANGE_HERO_GLOW }
  }
  return {
    topWash: accentAlpha(resolved, 0.12),
    glowBright: accentAlpha(resolved, 0.45),
    glowMid: accentAlpha(resolved, 0.12),
    glowSecondary: heroSecondaryGlow(resolved),
  }
}

function pushAccentVars(target: HTMLElement, resolved: string) {
  target.style.setProperty("--arciin-accent", resolved)
  target.style.setProperty(
    "--arciin-accent-intro-from",
    `color-mix(in srgb, ${resolved} 78%, white)`,
  )
  target.style.setProperty(
    "--arciin-accent-intro-to",
    `color-mix(in srgb, ${resolved} 58%, black)`,
  )
  target.style.setProperty("--arciin-accent-hover", `color-mix(in srgb, ${resolved} 88%, white)`)
  target.style.setProperty("--arciin-accent-muted", `color-mix(in srgb, ${resolved} 12%, transparent)`)
  target.style.setProperty("--arciin-accent-soft", `color-mix(in srgb, ${resolved} 10%, white)`)
  target.style.setProperty("--arciin-accent-surface", `color-mix(in srgb, ${resolved} 14%, #fafafa)`)
  target.style.setProperty("--arciin-accent-ring", `color-mix(in srgb, ${resolved} 32%, transparent)`)
  target.style.setProperty("--arciin-accent-glow", accentAlpha(resolved, 0.4))
  target.style.setProperty("--arciin-accent-wash", accentAlpha(resolved, 0.16))
  target.style.setProperty(
    "--arciin-accent-icon-bg",
    `color-mix(in srgb, ${resolved} 8%, transparent)`,
  )
  target.style.setProperty(
    "--arciin-accent-icon-border",
    `color-mix(in srgb, ${resolved} 18%, transparent)`,
  )
  target.style.setProperty(
    "--arciin-accent-icon-ring",
    `color-mix(in srgb, ${resolved} 15%, transparent)`,
  )
  target.style.setProperty(
    "--arciin-accent-badge-bg",
    `color-mix(in srgb, ${resolved} 10%, transparent)`,
  )
  target.style.setProperty(
    "--arciin-accent-badge-border",
    `color-mix(in srgb, ${resolved} 22%, transparent)`,
  )

  target.style.setProperty(
    "--arciin-folder-tab-light",
    `color-mix(in srgb, ${resolved} 42%, white)`,
  )
  target.style.setProperty("--arciin-folder-tab-dark", resolved)
  target.style.setProperty(
    "--arciin-folder-body-light",
    `color-mix(in srgb, ${resolved} 32%, white)`,
  )
  target.style.setProperty(
    "--arciin-folder-body-dark",
    `color-mix(in srgb, ${resolved} 78%, black)`,
  )
  target.style.setProperty(
    "--arciin-folder-glow-from",
    `color-mix(in srgb, ${resolved} 48%, white)`,
  )
  target.style.setProperty("--arciin-folder-glow-to", resolved)

  // Profile / auth dark hero ember glow — Orange matches original; other accents use same structure.
  const hero = heroGlowTokens(resolved)
  target.style.setProperty("--arciin-hero-top-wash", hero.topWash)
  target.style.setProperty("--arciin-hero-glow-bright", hero.glowBright)
  target.style.setProperty("--arciin-hero-glow-mid", hero.glowMid)
  target.style.setProperty("--arciin-hero-glow-secondary", hero.glowSecondary)

  target.style.setProperty("--primary", resolved)
  target.style.setProperty("--chart-1", resolved)
}

/** Push accent + derived tokens to :root for gradients, glows, and UI. */
export function applyAccentTokens(accent: string) {
  if (typeof document === "undefined") return

  const resolved = canonicalAccentHex(accent)
  pushAccentVars(document.documentElement, resolved)

  const host = document.querySelector(".mobile-app-host")
  if (host instanceof HTMLElement) {
    pushAccentVars(host, resolved)
    host.style.setProperty("--ring", `color-mix(in srgb, ${resolved} 28%, transparent)`)
  }
}
