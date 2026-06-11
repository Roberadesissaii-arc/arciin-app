const SETUP_COMPLETE_KEY = "arciin_standalone_setup_complete"

export const STANDALONE_DEFAULT_STORAGE_ROOT = "/srv/arciin-storage/arciin"

/** Persisted after a successful claim on this device. */
export function markStandaloneSetupComplete(): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(SETUP_COMPLETE_KEY, "1")
}

export function isStandaloneSetupCompleteLocal(): boolean {
  if (typeof localStorage === "undefined") return false
  return localStorage.getItem(SETUP_COMPLETE_KEY) === "1"
}

/** Best-effort default before the API responds with discovery/status. */
export function defaultStorageRootForSetup(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ARCIIN_DEFAULT_STORAGE?.trim()
  if (fromEnv) return fromEnv

  if (typeof window !== "undefined") {
    const port = Number.parseInt(window.location.port, 10)
    if (port >= 3000 && port < 3100) {
      return "./data/arciin"
    }
  }

  return STANDALONE_DEFAULT_STORAGE_ROOT
}

/** First-run setup — no account yet; unreachable API is expected until the server starts. */
export function isFirstRunSetupContext(gate: {
  instanceReady: boolean
  error: string | null
}): boolean {
  if (gate.instanceReady) return false
  if (isStandaloneSetupCompleteLocal()) return false
  return true
}
