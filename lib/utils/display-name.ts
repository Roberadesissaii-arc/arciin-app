export function splitDisplayName(name: string | undefined) {
  const t = name?.trim() ?? ""
  if (!t) return { first: "", last: "" }
  const i = t.indexOf(" ")
  if (i < 0) return { first: t, last: "" }
  return { first: t.slice(0, i), last: t.slice(i + 1).trim() }
}

export function joinDisplayName(first: string, last: string) {
  return [first.trim(), last.trim()].filter(Boolean).join(" ")
}
