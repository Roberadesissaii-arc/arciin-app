/** Resolve setup token from URL (?token=), install env, or dev API status. */
export function setupTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null
  const raw = new URLSearchParams(window.location.search).get("token")?.trim()
  return raw || null
}

export async function fetchInstallSetupTokenPrefill(): Promise<string | null> {
  try {
    const res = await fetch("/api/setup-prefill", { cache: "no-store" })
    if (!res.ok) return null
    const json = (await res.json()) as { token?: string | null }
    const token = json.token?.trim()
    return token || null
  } catch {
    return null
  }
}
