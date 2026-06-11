import { getBrowserApiUrl } from "@/lib/api/browser-api-origin"
import {
  arciinProxyHeaders,
  needsArciinSameOriginProxy,
} from "@/lib/api/arciin-proxy"
import { apiBaseCandidates, buildApiUrl, fetchApi } from "@/lib/api/client"
import { isStandaloneApp } from "@/lib/standalone/config"
import { ApiError, networkErrorMessage, parseApiError } from "@/lib/api/errors"
import { fetchArciinProxied, shouldUseArciinProxy } from "@/lib/api/proxy-fetch"
import type { MobileConnection } from "@/lib/types/api"
import type {
  ChatConversationDetail,
  ChatConversationSummary,
  ChatMessageFeedbackRating,
  ChatProfile,
} from "@/lib/types/chat"

export type ChatInstanceContext = {
  libraries: { id: string; slug: string; name: string; kind: string; count: number }[]
  folders: {
    id: string
    libraryId: string
    librarySlug: string
    name: string
    pathCache: string
    assetCount: number
  }[]
  appDatabases: {
    id: string
    name: string
    slug: string
    description: string | null
    tableCount: number
    createdAt: string
  }[]
  byMediaType: { type: string; count: number }[]
  codeFiles?: {
    id: string
    filename: string
    mediaType: string
    sizeBytes: number
    librarySlug: string
    libraryName: string
  }[]
  documentFiles?: {
    id: string
    filename: string
    mediaType: string
    sizeBytes: number
    librarySlug: string
    libraryName: string
  }[]
  storageGb: number
  lastUploadAt: string | null
  passwordVaultLine?: string | null
}

export function getChatProfiles(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<ChatProfile[]>("/chat/profiles", { connection, method: "GET", signal })
}

export function getChatConversations(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<ChatConversationSummary[]>("/chat/conversations", {
    connection,
    method: "GET",
    signal,
  })
}

export function getChatConversation(
  connection: MobileConnection,
  id: string,
  signal?: AbortSignal,
) {
  return fetchApi<ChatConversationDetail>(`/chat/conversations/${id}`, {
    connection,
    method: "GET",
    signal,
  })
}

export function createChatConversation(
  connection: MobileConnection,
  input: { title: string; profileId?: string },
) {
  return fetchApi<{ id: string; title: string; createdAt: string; updatedAt: string }>(
    "/chat/conversations",
    { connection, method: "POST", body: input },
  )
}

export function saveChatMessages(
  connection: MobileConnection,
  input: {
    conversationId: string
    messages: {
      role: string
      content: string
      inputTokens?: number
      outputTokens?: number
      totalTokens?: number
    }[]
  },
) {
  return fetchApi<{
    messages: {
      id: string
      role: string
      feedbackRating: ChatMessageFeedbackRating | null
      createdAt: string
    }[]
  }>("/chat/conversations/messages", { connection, method: "POST", body: input })
}

export function setChatMessageFeedback(
  connection: MobileConnection,
  messageId: string,
  rating: ChatMessageFeedbackRating | null,
) {
  return fetchApi<{
    id: string
    feedbackRating: ChatMessageFeedbackRating | null
    feedbackAt: string | null
  }>(`/chat/messages/${messageId}/feedback`, {
    connection,
    method: "PATCH",
    body: { rating },
  })
}

export function getChatInstanceContext(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<ChatInstanceContext>("/chat/context", {
    connection,
    method: "GET",
    signal,
  })
}

export async function deleteChatConversation(connection: MobileConnection, id: string) {
  const encoded = encodeURIComponent(id)

  if (shouldUseArciinProxy(connection)) {
    try {
      return await fetchArciinProxied<{ success: true }>(
        connection,
        `chat/conversations/${encoded}/delete`,
        { method: "POST" },
      )
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return fetchArciinProxied<{ success: true }>(
          connection,
          `chat/conversations/${encoded}`,
          { method: "DELETE" },
        )
      }
      throw err
    }
  }

  try {
    return await fetchApi<{ success: true }>(`/chat/conversations/${id}/delete`, {
      connection,
      method: "POST",
    })
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return fetchApi<{ success: true }>(`/chat/conversations/${id}`, {
        connection,
        method: "DELETE",
      })
    }
    throw err
  }
}

export type ChatSelection = {
  profileId: string
  model: string
}

export function getChatSelection(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<ChatSelection | null>("/chat/selection", {
    connection,
    method: "GET",
    signal,
  })
}

export function setChatSelection(connection: MobileConnection, input: ChatSelection) {
  return fetchApi<ChatSelection>("/chat/selection", {
    connection,
    method: "POST",
    body: input,
  })
}

export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

type StreamHandlers = {
  onText: (chunk: string) => void
  onThinking?: (chunk: string) => void
  onUsage?: (usage: TokenUsage) => void
  onLibraryAction?: (action: string) => void
  signal?: AbortSignal
}

/** PWA on Vercel → same-origin proxy; standalone/LAN co-located → page origin `/api` (like desktop). */
function chatStreamUrlCandidates(connection: MobileConnection): string[] {
  if (typeof window !== "undefined" && isStandaloneApp()) {
    return [getBrowserApiUrl("/chat")]
  }
  if (needsArciinSameOriginProxy(connection.apiBaseUrl)) {
    return ["/api/arciin/chat"]
  }
  const bases = apiBaseCandidates(connection.apiBaseUrl, connection)
  const urls = bases.map((base) => buildApiUrl(base, "/chat"))
  return [...new Set(urls)]
}

function isEventStreamResponse(response: Response): boolean {
  const type = response.headers.get("content-type") ?? ""
  return type.includes("text/event-stream") || type.includes("application/x-ndjson")
}

export async function streamChat(
  connection: MobileConnection,
  body: {
    profileId?: string
    model?: string
    messages: { role: string; content: string }[]
  },
  handlers: StreamHandlers,
): Promise<void> {
  const candidates = chatStreamUrlCandidates(connection)
  const token = connection.sessionToken

  const useProxy = needsArciinSameOriginProxy(connection.apiBaseUrl)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...(useProxy ? arciinProxyHeaders(connection) : {}),
  }
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response | null = null
  let lastFailedResponse: Response | null = null
  let lastNetworkError: unknown = null

  for (const url of candidates) {
    try {
      const attempt = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: handlers.signal,
        cache: "no-store",
        credentials: useProxy ? "same-origin" : token ? "include" : "same-origin",
      })
      if (attempt.ok && isEventStreamResponse(attempt)) {
        response = attempt
        break
      }
      if (attempt.ok) {
        lastFailedResponse = attempt
        continue
      }
      lastFailedResponse = attempt
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err
      }
      lastNetworkError = err
    }
  }

  if (!response) {
    if (lastFailedResponse) {
      throw await parseApiError(lastFailedResponse)
    }
    if (lastNetworkError instanceof Error && lastNetworkError.message) {
      throw new ApiError(0, "NETWORK_ERROR", lastNetworkError.message)
    }
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      networkErrorMessage(connection.apiBaseUrl ?? connection.webUrl),
    )
  }

  if (!response.body) {
    throw new ApiError(502, "INVALID_RESPONSE", "Chat stream returned no body.")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let streamDone = false

  while (true) {
    const { done, value } = await reader.read()
    if (value) buffer += decoder.decode(value, { stream: true })
    if (done) buffer += decoder.decode()

    const lines = buffer.split("\n")
    buffer = done ? "" : (lines.pop() ?? "")

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data:")) continue
      const payload = trimmed.slice(5).trim()
      if (payload === "[DONE]") {
        streamDone = true
        continue
      }
      let json: {
        error?: string
        text?: string
        thinking?: string
        usage?: TokenUsage
        libraryAction?: string
      }
      try {
        json = JSON.parse(payload)
      } catch {
        // Truncated/malformed frame (connection drop mid-line) — skip it.
        // Parse-error messages differ per engine (V8 vs WebKit), so never match on text.
        continue
      }
      if (json.error) throw new Error(json.error)
      if (json.libraryAction) handlers.onLibraryAction?.(json.libraryAction)
      if (json.thinking) handlers.onThinking?.(json.thinking)
      if (json.text) handlers.onText(json.text)
      if (json.usage) handlers.onUsage?.(json.usage)
    }

    if (streamDone || done) break
  }
}

export type StreamChatResult = {
  text: string
  thinking: string
}

/** Like `streamChat`, but throws if the model returns no visible reply after reasoning split. */
export async function streamChatWithCheck(
  connection: MobileConnection,
  body: Parameters<typeof streamChat>[1],
  handlers: StreamHandlers,
): Promise<StreamChatResult> {
  let accumulated = ""
  let thinkingAccum = ""
  await streamChat(connection, body, {
    ...handlers,
    onText: (chunk) => {
      accumulated += chunk
      handlers.onText?.(chunk)
    },
    onThinking: (chunk) => {
      thinkingAccum += chunk
      handlers.onThinking?.(chunk)
    },
  })
  if (!accumulated.trim() && !thinkingAccum.trim()) {
    throw new ApiError(
      502,
      "EMPTY_RESPONSE",
      "The model returned no reply. Check the model is configured and reachable on your Arciin server.",
    )
  }
  return { text: accumulated, thinking: thinkingAccum }
}
