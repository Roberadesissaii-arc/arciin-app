/** Arciin mobile runs as a standalone app (no desktop pairing or multi-server connect). */
export function isStandaloneApp(): boolean {
  const flag = process.env.NEXT_PUBLIC_ARCIIN_STANDALONE?.trim().toLowerCase()
  if (flag === "0" || flag === "false") return false
  return true
}
