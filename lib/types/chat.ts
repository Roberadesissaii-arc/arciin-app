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

export type ChatMessageFeedbackRating = "LIKE" | "DISLIKE"

export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type ChatMessageRecord = {
  id: string
  conversationId: string
  role: string
  content: string
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  feedbackRating: ChatMessageFeedbackRating | null
  feedbackAt: string | null
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
  dbId?: string
  role: "user" | "assistant"
  content: string
  thinking?: string
  pending?: boolean
  feedback?: ChatMessageFeedbackRating | null
  usage?: TokenUsage
}
