import { getInstanceStatus } from "@/lib/api/instance"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import { deriveMobileServerUrlsFromApiBase } from "@/lib/connection/normalize-url"
import { saveServerProfile } from "@/lib/connection/storage"

/** Persist the local Arciin API as the only server profile (standalone mode). */
export async function bootstrapStandaloneServerProfile(): Promise<void> {
  const apiBaseUrl = getStandaloneApiBaseUrl()
  const clientUrls = deriveMobileServerUrlsFromApiBase(apiBaseUrl)
  try {
    const status = await getInstanceStatus()
    saveServerProfile({
      ...clientUrls,
      instanceName: status.instanceName ?? "Arciin",
    })
  } catch {
    saveServerProfile({
      ...clientUrls,
      instanceName: "Arciin",
    })
  }
}
