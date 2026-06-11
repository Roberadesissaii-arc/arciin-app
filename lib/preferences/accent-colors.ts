/** Accent swatches allowed by the API — keep in sync with @arciin/shared ACCENT_COLORS. */
export const MOBILE_ACCENT_COLORS = [
  { hex: "#FF4F12", label: "Orange" },
  { hex: "#f97316", label: "Amber" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#0ea5e9", label: "Sky" },
  { hex: "#10b981", label: "Green" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#e11d48", label: "Rose" },
  { hex: "#64748b", label: "Slate" },
] as const

export function canonicalAccentHex(hex: string): string {
  const lower = hex.toLowerCase()
  const match = MOBILE_ACCENT_COLORS.find((c) => c.hex.toLowerCase() === lower)
  return match?.hex ?? hex
}

export function accentHexMatches(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}
