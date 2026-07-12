import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"

export type LicenseFeatureRow = {
  id: string
  label: string
}

export type LicenseStatusView = {
  plan: string
  planName: string
  planDescription: string
  status: "none" | "active" | "grace" | "expired" | string
  instanceId: string | null
  keyPrefix: string | null
  activatedAt: string | null
  expiresAt: string | null
  graceUntil: string | null
  features: LicenseFeatureRow[]
  isFreeCore: boolean
  premiumActive: boolean
  servers?: {
    activated: number
    limit: number | "custom"
    lastCheckIn: string | null
  }
}

export function getLicenseStatus(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<LicenseStatusView>("/license/status", { connection, signal })
}
