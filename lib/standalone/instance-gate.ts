import { getInstanceStatus } from "@/lib/api/instance"
import { bootstrapStandaloneServerProfile } from "@/lib/standalone/bootstrap-server"
import {
  isStandaloneSetupCompleteLocal,
  markStandaloneSetupComplete,
} from "@/lib/standalone/first-run"
import type { InstanceStatus } from "@/lib/types/instance"

export type StandaloneInstanceGate = {
  status: InstanceStatus | null
  /** True when claim/setup has already completed on this API. */
  instanceReady: boolean
  error: string | null
}

let cachedGate: StandaloneInstanceGate | null = null
let loadPromise: Promise<StandaloneInstanceGate> | null = null

/** Synchronous read after the first successful gate load this session. */
export function getCachedStandaloneInstanceGate(): StandaloneInstanceGate | null {
  return cachedGate
}

/** Load instance status from the local Arciin API (shared with desktop when same URL). */
export async function loadStandaloneInstanceGate(options?: {
  refresh?: boolean
}): Promise<StandaloneInstanceGate> {
  if (!options?.refresh && cachedGate) return cachedGate
  if (!options?.refresh && loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      await bootstrapStandaloneServerProfile()
      const status = await getInstanceStatus()
      if (status.initialized) {
        markStandaloneSetupComplete()
      }
      cachedGate = {
        status,
        instanceReady: Boolean(status.initialized),
        error: null,
      }
      return cachedGate
    } catch (err) {
      const setupComplete = isStandaloneSetupCompleteLocal()
      cachedGate = {
        status: null,
        instanceReady: setupComplete,
        error:
          setupComplete && err instanceof Error
            ? err.message
            : setupComplete
              ? "Could not reach the Arciin API."
              : null,
      }
      return cachedGate
    } finally {
      loadPromise = null
    }
  })()

  return loadPromise
}
