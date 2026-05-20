import { fetchApi } from "@/lib/api/client"
import { ApiError, parseApiError } from "@/lib/api/errors"
import { normalizeApiBase } from "@/lib/connection/normalize-url"
import type { MobileConnection } from "@/lib/types/api"
import type {
  ChatConversationDetail,
  ChatConversationSummary,
  ChatProfile,
} from "@/lib/types/chat"

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
    messages: { role: string; content: string }[]
  },
) {
  return fetchApi<{
    messages: { id: string; role: string; createdAt: string }[]
  }>("/chat/conversations/messages", { connection, method: "POST", body: input })
}

export function deleteChatConversation(connection: MobileConnection, id: string) {
  return fetchApi<{ success: true }>(`/chat/conversations/${id}`, {
    connection,
    method: "DELETE",
  })
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

type StreamHandlers = {
  onText: (chunk: string) => void
  onThinking?: (chunk: string) => void
  signal?: AbortSignal
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
  const apiBase = normalizeApiBase(connection.apiBaseUrl)
  const url = `${apiBase.replace(/\/+$/, "")}/chat`

  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${connection.sessionToken}`,
      },
      body: JSON.stringify(body),
      signal: handlers.signal,
      cache: "no-store",
    })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err
    }
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the chat API.")
  }

  if (!response.ok) {
    const err = await parseApiError(response)
    throw err
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
      try {
        const json = JSON.parse(payload) as {
          error?: string
          text?: string
          thinking?: string
        }
        if (json.error) throw new Error(json.error)
        if (json.thinking) handlers.onThinking?.(json.thinking)
        if (json.text) handlers.onText(json.text)
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
          throw parseErr
        }
      }
    }

    if (streamDone || done) break
  }
}
