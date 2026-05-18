const PILL_COLORS: Record<string, string> = {
  OWNER: "#6366f1",
  ADMIN: "#2563eb",
  MEMBER: "#65a30d",
  VIEWER: "#64748b",
  ACTIVE: "#16a34a",
  DISABLED: "#dc2626",
  READY: "#16a34a",
  FAILED: "#dc2626",
  QUEUED: "#d97706",
  COMPLETED: "#16a34a",
  true: "#16a34a",
  false: "#64748b",
}

export function formatCellValue(value: unknown): { text: string; pill?: string } {
  if (value === null || value === undefined) {
    return { text: "null" }
  }
  if (typeof value === "boolean") {
    const color = PILL_COLORS[String(value)] ?? "#64748b"
    return { text: String(value), pill: color }
  }
  const str = String(value)
  const color = PILL_COLORS[str]
  if (color) {
    return { text: str, pill: color }
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return { text: new Date(str).toLocaleString() }
  }
  if (/^c[a-z0-9]{20,}$/i.test(str)) {
    return { text: `${str.slice(0, 10)}…` }
  }
  if (str.length > 56) {
    return { text: `${str.slice(0, 56)}…` }
  }
  return { text: str }
}
