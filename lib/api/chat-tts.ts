import { needsArciinSameOriginProxy } from "@/lib/api/arciin-proxy"
import { fetchApi } from "@/lib/api/client"
import { fetchArciinProxied } from "@/lib/api/proxy-fetch"
import { isStandaloneApp } from "@/lib/standalone/config"
import type { MobileConnection } from "@/lib/types/api"

export type ChatTtsResult = {
  audioBase64: string
  mimeType: string
}

/**
 * Gemini read-aloud — same routing as chat streaming: co-located standalone and
 * cross-origin PWA installs use /api/arciin/* so the server resolves ARCIIN_API_URL.
 */
export function synthesizeChatTts(
  connection: MobileConnection,
  input: {
    text: string
    profileId?: string
    voice?: string
    signal?: AbortSignal
  },
) {
  const body = {
    text: input.text,
    ...(input.profileId ? { profileId: input.profileId } : {}),
    ...(input.voice ? { voice: input.voice } : {}),
  }

  const useArciinProxy =
    (typeof window !== "undefined" && isStandaloneApp()) ||
    needsArciinSameOriginProxy(connection.apiBaseUrl)

  if (useArciinProxy) {
    return fetchArciinProxied<ChatTtsResult>(connection, "chat/tts", {
      method: "POST",
      body,
      signal: input.signal,
    })
  }

  return fetchApi<ChatTtsResult>("/chat/tts", {
    connection,
    method: "POST",
    body,
    signal: input.signal,
  })
}
