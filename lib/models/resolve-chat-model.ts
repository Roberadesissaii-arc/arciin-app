import { getAvailableModels } from "@/lib/api/models"
import type { MobileConnection } from "@/lib/types/api"
import type { ChatProfile } from "@/lib/types/chat"

import { chatModelForProfile } from "./model-helpers"
import { providerMetaFor } from "./provider-catalog"
import { isOllamaProvider, normalizeProviderId } from "./ollama-providers"

export function modelLabelForProfile(profile: ChatProfile, selectedModel: string): string {
  const m = selectedModel.trim() || profile.defaultModel?.trim()
  if (m) return m
  const meta = providerMetaFor(normalizeProviderId(profile.provider))
  return meta?.suggestedModels[0] ?? profile.provider
}

/** First model to use when nothing is selected yet. */
export async function resolveChatModelForProfile(
  connection: MobileConnection,
  profile: ChatProfile,
  preferred?: string | null,
): Promise<string> {
  const pref = preferred?.trim()
  if (pref) return pref

  const fromProfile = profile.defaultModel?.trim()
  if (fromProfile) return fromProfile

  if (isOllamaProvider(profile.provider)) {
    try {
      const result = await getAvailableModels(connection, profile.id)
      const first = result.models.find((m) => m.trim().length > 0)
      if (first) return first
    } catch {
      /* fall through */
    }
  }

  const meta = providerMetaFor(normalizeProviderId(profile.provider))
  return chatModelForProfile({ defaultModel: profile.defaultModel }, meta)
}
