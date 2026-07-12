/** Arciin mobile is a client app — it connects to the Arciin API only (no local database). */
export function isStandaloneApp(): boolean {
  const flag = process.env.NEXT_PUBLIC_ARCIIN_STANDALONE?.trim().toLowerCase()
  if (flag === "0" || flag === "false") return false
  return true
}
