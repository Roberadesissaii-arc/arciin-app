import type { ProviderMeta } from "@/lib/models/provider-catalog"
import type { ModelProfile } from "@/lib/types/models"

export function isProviderConnected(
  profile: ModelProfile | undefined,
  meta: ProviderMeta,
): boolean {
  return Boolean(profile?.isEnabled && (profile.hasApiKey || !meta.requiresKey))
}

export function profileForProvider(
  profiles: ModelProfile[],
  providerId: string,
): ModelProfile | undefined {
  return profiles.find((p) => p.provider === providerId)
}

/** Model id sent to chat — profile default or catalogue fallback. */
export function chatModelForProfile(
  profile: ModelProfile,
  providerMeta?: ProviderMeta,
): string {
  const fromProfile = profile.defaultModel?.trim()
  if (fromProfile) return fromProfile
  const suggested = providerMeta?.suggestedModels[0]
  if (suggested) return suggested
  return ""
}
