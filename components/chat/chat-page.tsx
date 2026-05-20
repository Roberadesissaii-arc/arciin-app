"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import {
  Clock,
  Copy,
  Loader2,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react"

import { ChatMarkdown } from "@/components/chat/chat-markdown"
import { ChatModelBar } from "@/components/chat/chat-model-bar"
import { ArciinMark } from "@/components/ui/arciin-mark"
import { Skeleton } from "@/components/ui/skeleton"
import { useChatChrome } from "@/components/chat/chat-chrome-context"
import { useConnection } from "@/components/providers/connection-provider"
import { useChatViewport } from "@/hooks/use-chat-viewport"
import { isOllamaProvider } from "@/lib/models/ollama-providers"
import { resolveChatModelForProfile } from "@/lib/models/resolve-chat-model"
import {
  createChatConversation,
  deleteChatConversation,
  getChatConversation,
  getChatConversations,
  getChatInstanceContext,
  getChatProfiles,
  getChatSelection,
  saveChatMessages,
  setChatMessageFeedback,
  streamChatWithCheck,
  type ChatInstanceContext,
  type TokenUsage,
} from "@/lib/api/chat"
import { buildOutboundChatMessages } from "@/lib/chat/build-context"
import { ARCIIN_MOBILE_SYSTEM_INSTRUCTION } from "@/lib/chat/system-prompt"
import { formatApiError, isNetworkError } from "@/lib/api/errors"
import type { MobileConnection } from "@/lib/types/api"
import type {
  ChatConversationSummary,
  ChatMessage,
  ChatMessageFeedbackRating,
  ChatProfile,
} from "@/lib/types/chat"
import { relativeTime } from "@/lib/utils/relative-time"
import { cn } from "@/lib/utils"

import { createId } from "@/lib/utils/create-id"

function messagePersistId(msg: ChatMessage): string | null {
  if (msg.dbId) return msg.dbId
  if (msg.role === "assistant" && /^c[a-z0-9]{20,}$/i.test(msg.id)) return msg.id
  return null
}

function titleFromMessage(text: string) {
  const t = text.trim().replace(/\s+/g, " ")
  return t.length > 48 ? `${t.slice(0, 48)}…` : t || "New chat"
}

const CHAT_SUGGESTIONS = [
  "What files did I upload recently?",
  "How much storage am I using?",
  "Show me all my videos",
] as const

function ChatWelcomePanel({
  profilesLoading,
  needsModelSetup,
  onPickSuggestion,
}: {
  profilesLoading: boolean
  needsModelSetup: boolean
  onPickSuggestion: (text: string) => void
}) {
  if (profilesLoading) {
    return (
      <div className="chat-welcome flex flex-1 flex-col items-center justify-center gap-4 px-6">
        <Skeleton className="h-8 w-[7.5rem] rounded-lg" />
        <Skeleton className="h-3.5 w-52 max-w-full rounded-md" />
        <Skeleton className="h-3.5 w-44 max-w-full rounded-md" />
      </div>
    )
  }

  if (needsModelSetup) {
    return (
      <div className="chat-welcome flex flex-1 flex-col items-center justify-center gap-5 px-6">
        <ArciinMark size="lg" />
        <p className="max-w-[17rem] text-center text-[13px] leading-relaxed text-[#717171]">
          Connect an AI provider on your Arciin server to start chatting with your libraries and
          files.
        </p>
        <Link
          href="/models"
          className="rounded-2xl px-6 py-3 text-[13px] font-semibold text-white active:opacity-90"
          style={{ backgroundColor: "#ff4f12" }}
        >
          Configure models
        </Link>
      </div>
    )
  }

  return (
    <div className="chat-welcome flex flex-1 flex-col items-center justify-center gap-5 px-2">
      <ArciinMark size="lg" />
      <p className="max-w-xs text-center text-[13px] leading-relaxed text-[#717171]">
        Ask about your files, libraries, or instance.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-2">
        {CHAT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPickSuggestion(s)}
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left active:bg-[#f7f7f7]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <Sparkles className="size-3.5 shrink-0 text-[#a0a0a0]" />
            <span className="text-[12px] text-[#717171]">{s}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── History drawer (inset, rounded) ───────────────────────────────────────────

function HistoryDrawer({
  open,
  onClose,
  conversations,
  activeId,
  loading,
  loadingId,
  onSelect,
  onNew,
  onDelete,
  deletingId,
  historyError,
}: {
  open: boolean
  onClose: () => void
  conversations: ChatConversationSummary[]
  activeId: string | null
  loading: boolean
  loadingId: string | null
  deletingId: string | null
  historyError: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}) {
  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/25"
        aria-label="Close history"
        onClick={onClose}
      />

      <aside
        className="fixed z-50 flex w-[min(17.5rem,86vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.14)]"
        style={{
          top: "max(0.75rem, env(safe-area-inset-top))",
          bottom: "max(0.75rem, env(safe-area-inset-bottom))",
          right: "0.75rem",
          border: "1px solid #e5e5e5",
        }}
        role="dialog"
        aria-label="Chat history"
      >
        <div
          className="flex items-center justify-between border-b border-[#ececec] px-4 py-3.5"
        >
          <span
            className="text-[15px] font-bold text-[#222222]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            History
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-[#717171] active:bg-[#f7f7f7]"
            aria-label="Close"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={onNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold text-white active:opacity-90"
            style={{ backgroundColor: "#ff4f12" }}
          >
            <Plus className="size-4" />
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide">
          {historyError ? (
            <p
              className="mb-3 rounded-xl px-3 py-2 text-[11px] text-[#b91c1c]"
              style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
            >
              {historyError}
            </p>
          ) : null}

          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Recent
          </p>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-[#a0a0a0]" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#a0a0a0]">No conversations yet</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {conversations.map((convo) => {
                const active = convo.id === activeId
                const preview = convo.messages[0]?.content?.slice(0, 72) ?? ""
                return (
                  <li key={convo.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(convo.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onSelect(convo.id)
                        }
                      }}
                      className={cn(
                        "group relative flex w-full cursor-pointer flex-col gap-0.5 rounded-xl px-3.5 py-3 text-left transition-colors active:opacity-90",
                        active
                          ? "bg-[#fff7f4] ring-1 ring-[#ff4f12]/25"
                          : "bg-[#f7f7f7] active:bg-[#f0f0f0]",
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        {loadingId === convo.id ? (
                          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-[#ff4f12]" />
                        ) : (
                          <MessageSquare
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              active ? "text-[#ff4f12]" : "text-[#a0a0a0]",
                            )}
                          />
                        )}
                        <div className="min-w-0 flex-1 pr-6">
                          <span
                            className={cn(
                              "line-clamp-1 text-[13px] font-semibold",
                              active ? "text-[#ff4f12]" : "text-[#222222]",
                            )}
                          >
                            {convo.title}
                          </span>
                          {preview ? (
                            <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#717171]">
                              {preview}
                            </span>
                          ) : null}
                          <span className="mt-1 block text-[10px] text-[#a0a0a0]">
                            {relativeTime(convo.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === convo.id}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          onDelete(convo.id)
                        }}
                        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg text-[#c0c0c0] active:bg-[#fee2e2] active:text-[#b91c1c] disabled:opacity-50"
                        aria-label="Delete conversation"
                      >
                        {deletingId === convo.id ? (
                          <Loader2 className="size-3.5 animate-spin text-[#b91c1c]" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageActions({
  content,
  feedback,
  canRegenerate,
  onRegenerate,
  onFeedback,
}: {
  content: string
  feedback?: ChatMessageFeedbackRating | null
  canRegenerate: boolean
  onRegenerate?: () => void
  onFeedback?: (rating: ChatMessageFeedbackRating | null) => void
}) {
  const btn =
    "flex size-8 items-center justify-center rounded-lg text-[#717171] active:bg-[#f7f7f7]"
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard denied */
    }
  }

  return (
    <div className="mt-1.5 flex items-center gap-0.5">
      {onFeedback ? (
        <>
          <button
            type="button"
            className={cn(btn, feedback === "LIKE" && "text-[#ff4f12]")}
            aria-label="Good response"
            onClick={() => onFeedback(feedback === "LIKE" ? null : "LIKE")}
          >
            <ThumbsUp className="size-3.5" />
          </button>
          <button
            type="button"
            className={cn(btn, feedback === "DISLIKE" && "text-[#b91c1c]")}
            aria-label="Poor response"
            onClick={() => onFeedback(feedback === "DISLIKE" ? null : "DISLIKE")}
          >
            <ThumbsDown className="size-3.5" />
          </button>
        </>
      ) : null}
      {canRegenerate && onRegenerate ? (
        <button type="button" className={btn} aria-label="Regenerate" onClick={onRegenerate}>
          <RotateCcw className="size-3.5" />
        </button>
      ) : null}
      <button type="button" className={btn} aria-label="Copy" onClick={() => void handleCopy()}>
        {copied ? (
          <span className="text-[10px] font-semibold text-[#22c55e]">OK</span>
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  )
}

function MessageBubble({
  msg,
  isStreaming = false,
  canRegenerate = false,
  onRegenerate,
  onFeedback,
}: {
  msg: ChatMessage
  isStreaming?: boolean
  canRegenerate?: boolean
  onRegenerate?: () => void
  onFeedback?: (rating: ChatMessageFeedbackRating | null) => void
}) {
  const isUser = msg.role === "user"
  const hasContent = Boolean(msg.content.trim())
  const showActions = !isUser && !msg.pending && !isStreaming && hasContent

  return (
    <div className={cn("flex w-full flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
          isUser
            ? "rounded-br-md bg-[#ff4f12] text-white shadow-sm"
            : "rounded-bl-md bg-white text-[#222222] shadow-[0_1px_8px_rgba(0,0,0,0.04)]",
        )}
        style={isUser ? undefined : { border: "1px solid #e5e5e5" }}
      >
        {msg.pending && !hasContent ? (
          <span className="flex items-center gap-2 text-[#717171]">
            <Loader2 className="size-3.5 animate-spin text-[#ff4f12]" />
            Thinking…
          </span>
        ) : isUser || isStreaming ? (
          <p className="whitespace-pre-wrap break-words">
            {msg.content}
            {isStreaming && hasContent ? <span className="chat-stream-cursor" aria-hidden /> : null}
          </p>
        ) : (
          <ChatMarkdown content={msg.content} />
        )}
      </div>
      {showActions ? (
        <MessageActions
          content={msg.content}
          feedback={msg.feedback}
          canRegenerate={canRegenerate}
          onRegenerate={onRegenerate}
          onFeedback={onFeedback}
        />
      ) : null}
    </div>
  )
}

function serverHint(connection: MobileConnection | null) {
  return connection?.apiBaseUrl ?? connection?.webUrl
}

// ── Main page ─────────────────────────────────────────────────────────────────

function applyPersistedMessageIds(
  prev: ChatMessage[],
  saved: { id: string; role: string }[],
  pendingAssistantId: string,
  pendingUserId?: string,
) {
  const userRow = saved.find((m) => m.role === "user")
  const asstRow = saved.find((m) => m.role === "assistant")
  return prev.map((m) => {
    if (pendingUserId && m.id === pendingUserId && userRow) {
      return { ...m, id: userRow.id, dbId: userRow.id }
    }
    if (m.id === pendingAssistantId && asstRow) {
      return { ...m, id: asstRow.id, dbId: asstRow.id }
    }
    return m
  })
}

export function ChatPage() {
  const { connection, ready } = useConnection()
  const { setChrome } = useChatChrome()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [profiles, setProfiles] = useState<ChatProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [loadingConvoId, setLoadingConvoId] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [statusNote, setStatusNote] = useState("Chat connects to your Arciin API")
  const [error, setError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [chatContext, setChatContext] = useState<ChatInstanceContext | null>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useChatViewport(pageRef)

  const [selectedProfile, setSelectedProfile] = useState<ChatProfile | null>(null)
  const [selectedModel, setSelectedModel] = useState("")

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streaming, scrollToBottom])

  const applyProfileSelection = useCallback((list: ChatProfile[], profile: ChatProfile, model: string) => {
    setSelectedProfile(profile)
    setSelectedModel(model || profile.defaultModel || "")
  }, [])

  const loadProfiles = useCallback(async () => {
    if (!connection) return
    setProfilesLoading(true)
    try {
      const [list, remote] = await Promise.all([
        getChatProfiles(connection),
        getChatSelection(connection).catch(() => null),
      ])
      setProfiles(list)
      if (list.length === 0) {
        setSelectedProfile(null)
        setSelectedModel("")
        setStatusNote("No AI model configured — add one in Arciin Models")
        return
      }

      const remoteProfile = remote?.profileId
        ? list.find((p) => p.id === remote.profileId)
        : null
      const profile = remoteProfile ?? list.find((p) => p.isDefault) ?? list[0]
      const model = await resolveChatModelForProfile(connection, profile, remote?.model)
      applyProfileSelection(list, profile, model)
      if (!model.trim() && isOllamaProvider(profile.provider)) {
        setStatusNote("Open the model picker and choose an Ollama model")
      }
      setStatusNote("Chat connects to your Arciin API")
    } catch (err) {
      setError(formatApiError(err, serverHint(connection)))
      setStatusNote("Could not reach the API")
    } finally {
      setProfilesLoading(false)
    }
  }, [applyProfileSelection, connection])

  const loadHistory = useCallback(async () => {
    if (!connection) return
    setHistoryLoading(true)
    try {
      const list = await getChatConversations(connection)
      setConversations(list)
    } catch (err) {
      setError(formatApiError(err, serverHint(connection)))
    } finally {
      setHistoryLoading(false)
    }
  }, [connection])

  const loadChatContext = useCallback(async () => {
    if (!connection) return
    try {
      const ctx = await getChatInstanceContext(connection)
      setChatContext(ctx)
    } catch {
      /* context is optional for send; tools work better with it */
    }
  }, [connection])

  useEffect(() => {
    if (!ready || !connection) return
    void loadProfiles()
    void loadHistory()
    void loadChatContext()
  }, [ready, connection, loadProfiles, loadHistory, loadChatContext])

  useEffect(() => {
    if (!connection) return
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadProfiles()
        void loadChatContext()
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [connection, loadProfiles, loadChatContext])

  useEffect(() => {
    if (historyOpen && connection) void loadHistory()
  }, [historyOpen, connection, loadHistory])

  useEffect(() => {
    setChrome({
      onOpenHistory: () => {
        setHistoryError(null)
        setHistoryOpen(true)
      },
    })
    return () => setChrome(null)
  }, [setChrome])

  function startNewChat() {
    setConversationId(null)
    setMessages([])
    setError(null)
    setHistoryOpen(false)
    inputRef.current?.focus()
  }

  async function openConversation(id: string) {
    if (!connection) return
    setLoadingConvoId(id)
    setError(null)
    try {
      const convo = await getChatConversation(connection, id)
      setConversationId(convo.id)
      setMessages(
        convo.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            dbId: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            feedback: m.feedbackRating ?? null,
            usage: m.totalTokens
              ? {
                  inputTokens: m.inputTokens ?? 0,
                  outputTokens: m.outputTokens ?? 0,
                  totalTokens: m.totalTokens,
                }
              : undefined,
          })),
      )
      setHistoryOpen(false)
    } catch (err) {
      setError(formatApiError(err, serverHint(connection)))
    } finally {
      setLoadingConvoId(null)
    }
  }

  async function handleDeleteConversation(id: string) {
    if (!connection || deletingId) return

    setHistoryError(null)
    setDeletingId(id)

    const prevConversations = conversations
    const wasActive = conversationId === id

    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (wasActive) {
      setConversationId(null)
      setMessages([])
    }

    try {
      await deleteChatConversation(connection, id)
      if (wasActive) setHistoryOpen(false)
    } catch (err) {
      setConversations(prevConversations)
      if (wasActive) {
        setConversationId(id)
        void openConversation(id)
      }
      const message = formatApiError(err, serverHint(connection))
      setHistoryError(message)
    } finally {
      setDeletingId(null)
    }
  }

  function stopGeneration() {
    abortRef.current?.abort()
  }

  async function handleMessageFeedback(msg: ChatMessage, rating: ChatMessageFeedbackRating | null) {
    if (!connection || msg.pending) return
    const persistId = messagePersistId(msg)
    if (!persistId) {
      setStatusNote("Saving this reply… try again in a moment.")
      return
    }
    const next = msg.feedback === rating ? null : rating
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, feedback: next, dbId: persistId } : m)),
    )
    try {
      const updated = await setChatMessageFeedback(connection, persistId, next)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, feedback: updated.feedbackRating ?? null, dbId: updated.id }
            : m,
        ),
      )
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, feedback: msg.feedback ?? null } : m)),
      )
      setStatusNote("Could not save feedback")
    }
  }

  const runAssistantStream = useCallback(
    async (
      assistantId: string,
      history: { role: string; content: string }[],
      opts?: { conversationId?: string | null; pendingUserId?: string },
    ) => {
      if (!connection || !selectedProfile) return { content: "", usage: undefined as TokenUsage | undefined }

      const profile = selectedProfile
      const modelToSend =
        selectedModel.trim() || profile.defaultModel?.trim() || undefined
      if (!modelToSend) {
        throw new Error(
          isOllamaProvider(profile.provider)
            ? "Choose an Ollama model from the model picker (boxes icon)."
            : "No model configured for this provider.",
        )
      }
      const apiBase = connection.apiBaseUrl ?? connection.webUrl ?? ""
      const payload = buildOutboundChatMessages(
        history,
        ARCIIN_MOBILE_SYSTEM_INSTRUCTION,
        chatContext,
        apiBase,
      )

      abortRef.current = new AbortController()
      let usage: TokenUsage | undefined

      const content = await streamChatWithCheck(
        connection,
        {
          profileId: profile.id,
          model: modelToSend,
          messages: payload,
        },
        {
          signal: abortRef.current.signal,
          onText: (chunk) => {
            flushSync(() => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + chunk, pending: false }
                    : m,
                ),
              )
            })
          },
          onUsage: (u) => {
            usage = u
          },
          onLibraryAction: () => {
            void loadChatContext()
          },
        },
      )

      const convoId = opts?.conversationId ?? conversationId
      if (content.trim() && convoId) {
        const saved = await saveChatMessages(connection, {
          conversationId: convoId,
          messages: [
            {
              role: "assistant",
              content,
              inputTokens: usage?.inputTokens,
              outputTokens: usage?.outputTokens,
              totalTokens: usage?.totalTokens,
            },
          ],
        })
        setMessages((prev) =>
          applyPersistedMessageIds(prev, saved.messages, assistantId, opts?.pendingUserId).map((m) =>
            m.id === assistantId || m.dbId === saved.messages.find((r) => r.role === "assistant")?.id
              ? { ...m, usage, pending: false }
              : m,
          ),
        )
        void loadHistory()
      }

      return { content, usage }
    },
    [chatContext, connection, conversationId, loadChatContext, loadHistory, selectedModel, selectedProfile],
  )

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming || !connection || !selectedProfile) return

    const userMsg: ChatMessage = { id: createId(), role: "user", content: text }
    const assistantId = createId()
    const pendingMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
    }

    const profile = selectedProfile
    if (!profile) return

    setInput("")
    const inputEl = inputRef.current
    if (inputEl) {
      inputEl.style.height = "auto"
      inputEl.blur()
    }
    setError(null)
    const priorMessages = messages
    setMessages((prev) => [...prev, userMsg, pendingMsg])
    setStreaming(true)
    setStatusNote("Generating…")

    let activeConvoId = conversationId

    try {
      if (!activeConvoId) {
        const created = await createChatConversation(connection, {
          title: titleFromMessage(text),
          profileId: profile.id,
        })
        activeConvoId = created.id
        setConversationId(created.id)
      }

      void saveChatMessages(connection, {
        conversationId: activeConvoId,
        messages: [{ role: "user", content: text }],
      })
        .then((saved) => {
          setMessages((prev) => applyPersistedMessageIds(prev, saved.messages, assistantId, userMsg.id))
        })
        .finally(() => void loadHistory())

      const history = [...priorMessages, userMsg]
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({
          role: m.role,
          content: m.content.trim(),
        }))

      await runAssistantStream(assistantId, history, {
        conversationId: activeConvoId,
        pendingUserId: userMsg.id,
      })
      setStatusNote("Chat connects to your Arciin API")
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content))
      } else {
        const msg = formatApiError(err, serverHint(connection))
        setError(msg)
        setStatusNote(isNetworkError(err) ? "Could not reach server" : "Send failed")
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  async function regenerateAssistantMessage(assistantMsgId: string) {
    if (streaming || !connection || !selectedProfile) return
    const aiIdx = messages.findIndex((m) => m.id === assistantMsgId)
    if (aiIdx <= 0) return
    const userMsg = messages[aiIdx - 1]
    if (!userMsg || userMsg.role !== "user") return

    const priorMessages = messages.slice(0, aiIdx)
    const assistantId = createId()
    const pendingMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
    }

    setError(null)
    setMessages([...priorMessages, pendingMsg])
    setStreaming(true)
    setStatusNote("Regenerating…")

    const history = priorMessages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content.trim() }))

    try {
      await runAssistantStream(assistantId, history, { conversationId })
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content))
      } else {
        setError(formatApiError(err, serverHint(connection)))
        setStatusNote(isNetworkError(err) ? "Could not reach server" : "Regenerate failed")
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      setStatusNote("Chat connects to your Arciin API")
    }
  }

  const showWelcome = messages.length === 0
  const needsModelSetup = !profilesLoading && profiles.length === 0
  const canSend = Boolean(input.trim()) && !streaming && selectedProfile && !profilesLoading
  const canStop = streaming && Boolean(selectedProfile)

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <div ref={pageRef} className="chat-page px-4">
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        activeId={conversationId}
        loading={historyLoading}
        loadingId={loadingConvoId}
        deletingId={deletingId}
        historyError={historyError}
        onSelect={(id) => void openConversation(id)}
        onNew={startNewChat}
        onDelete={(id) => void handleDeleteConversation(id)}
      />

      {error ? (
        <div
          className="mb-3 shrink-0 rounded-xl px-3 py-2 text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </div>
      ) : null}

      <div ref={scrollRef} className="chat-page-messages flex flex-1 flex-col gap-3 scrollbar-hide">
        {showWelcome ? (
          <ChatWelcomePanel
            profilesLoading={profilesLoading}
            needsModelSetup={needsModelSetup}
            onPickSuggestion={setInput}
          />
        ) : (
          <div className="flex flex-col gap-3 pb-2">
            {(() => {
              const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id
              return messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isStreaming={streaming && msg.id === lastAssistantId}
                  canRegenerate={
                    msg.role === "assistant" &&
                    msg.id === lastAssistantId &&
                    !streaming &&
                    !msg.pending
                  }
                  onRegenerate={
                    msg.role === "assistant" && msg.id === lastAssistantId
                      ? () => void regenerateAssistantMessage(msg.id)
                      : undefined
                  }
                  onFeedback={
                    msg.role === "assistant"
                      ? (rating) => void handleMessageFeedback(msg, rating)
                      : undefined
                  }
                />
              ))
            })()}
          </div>
        )}
      </div>

      <div className="chat-page-composer">
        <div
          className="flex items-center gap-2 rounded-2xl bg-white px-2 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          {connection && profiles.length > 0 ? (
            <ChatModelBar
              variant="composer"
              connection={connection}
              profiles={profiles}
              selectedProfile={selectedProfile}
              selectedModel={selectedModel}
              loading={profilesLoading}
              onSelect={(profile, model) => applyProfileSelection(profiles, profile, model)}
            />
          ) : null}
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (streaming) stopGeneration()
                else void sendMessage()
              }
            }}
            placeholder={
              streaming
                ? "Generating… tap Stop to interrupt"
                : profilesLoading
                  ? "Loading…"
                  : !selectedProfile
                    ? "No AI model configured"
                    : "Ask anything…"
            }
            disabled={profilesLoading || !selectedProfile}
            className="max-h-[120px] min-h-[24px] min-w-0 flex-1 resize-none bg-transparent py-1 text-[14px] leading-snug text-[#222222] outline-none placeholder:text-[#a0a0a0] disabled:opacity-50"
          />
          {canStop ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#ef4444] active:opacity-90"
              aria-label="Stop generating"
            >
              <Square className="size-3.5 fill-white text-white" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSend}
              onClick={() => void sendMessage()}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#ff4f12" }}
              aria-label="Send"
            >
              <Send className="size-[15px] text-white" />
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[10px] text-[#a0a0a0]">
          {profilesLoading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-2.5 animate-spin" />
              Connecting…
            </span>
          ) : streaming ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-2.5 animate-spin" />
              {statusNote}
            </span>
          ) : error ? (
            <span className="text-[#b91c1c]">{statusNote}</span>
          ) : (
            statusNote
          )}
        </p>
      </div>
    </div>
  )
}
