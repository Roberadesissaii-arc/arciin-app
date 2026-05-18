export type ChatProfile = {
  id: string
  provider: string
  displayName: string
  defaultModel: string | null
  isDefault: boolean
}

export type ChatConversationSummary = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  profile: { id: string; displayName: string; provider: string } | null
  messages: { role: string; content: string }[]
}

export type ChatMessageRecord = {
  id: string
  conversationId: string
  role: string
  content: string
  createdAt: string
}

export type ChatConversationDetail = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  profile: { id: string; displayName: string; provider: string } | null
  messages: ChatMessageRecord[]
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  pending?: boolean
}
