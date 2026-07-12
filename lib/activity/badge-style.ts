import type { ActivitySummary } from "@/lib/types/models"

const ACCENT_BADGE = {
  bg: "var(--arciin-accent-soft, #fff4f0)",
  color: "var(--arciin-accent, #ff4f12)",
} as const

const SEMANTIC_BADGE: Record<string, { bg: string; color: string }> = {
  upload: { bg: "#dcfce7", color: "#16a34a" },
  asset: ACCENT_BADGE,
  folder: { bg: "#eff6ff", color: "#2563eb" },
  library: { bg: "#f5f3ff", color: "#7c3aed" },
  "api-key": { bg: "#fffbeb", color: "#d97706" },
  remote: ACCENT_BADGE,
  share: ACCENT_BADGE,
}

export function activityBadgeStyle(event: ActivitySummary) {
  const key = event.entityType ?? event.type.split(".")[0] ?? ""
  return SEMANTIC_BADGE[key] ?? { bg: "#f7f7f7", color: "#717171" }
}
