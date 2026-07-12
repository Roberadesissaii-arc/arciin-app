"use client"

import Link from "next/link"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import {
  Copy,
  Loader2,
  Lock as LockIcon,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Volume2,
  X,
} from "lucide-react"

import {
  forceResetChatKeyboard,
  syncChatKeyboardOffset,
  useChatKeyboard,
} from "@/hooks/use-chat-keyboard"
import { useChatTextToSpeech } from "@/hooks/use-chat-text-to-speech"
import { ChatMarkdownContent } from "@/components/chat/chat-markdown-content"
import { ChatModelBar } from "@/components/chat/chat-model-bar"
import { ChatReasoningBlock } from "@/components/chat/chat-reasoning-block"
import { ArciinMark } from "@/components/ui/arciin-mark"
import { Skeleton } from "@/components/ui/skeleton"
import { useChatChrome } from "@/components/chat/chat-chrome-context"
import {
  chatComposerFooterNote,
  chatComposerPlaceholder,
  suppressFetchErrorWhenOffline,
  useServerOnline,
} from "@/lib/connection/offline-ui"
import { isOllamaProvider } from "@/lib/models/ollama-providers"
import { resolveChatModelForProfile } from "@/lib/models/resolve-chat-model"
import {
  createChatConversation,
  deleteChatConversation,
  setChatSelection,
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
import {
  mergeAssetTagsFromThinking,
  stripAssetTagsFromText,
} from "@/lib/chat/asset-tag-patterns"
import { finalizeAssistantContent } from "@/lib/chat/finalize-assistant"
import {
  deriveStreamingThinkingAndAnswer,
  displayThinkingDuringStream,
  hasVisibleAssistantAnswer,
  resolveFinalAssistantMessage,
} from "@/lib/chat/reasoning"
import { getAiSettings } from "@/lib/api/settings"
import { plainTextFromMessage } from "@/lib/chat/plain-text-from-message"
import { ARCIIN_MOBILE_SYSTEM_INSTRUCTION } from "@/lib/chat/system-prompt"
import { normalizeAssistantDisplayText } from "@/lib/chat/strip-stream-markup"
import {
  formatApiError,
  formatChatProviderError,
  isLicenseRequiredError,
  isNetworkError,
  licenseRequiredPlan,
} from "@/lib/api/errors"
import { PlanBadge } from "@/components/shell/plan-badge"
import type { MobileConnection } from "@/lib/types/api"
import type {
  ChatConversationSummary,
  ChatMessage,
  ChatMessageFeedbackRating,
  ChatProfile,
} from "@/lib/types/chat"
import { relativeTime } from "@/lib/utils/relative-time"
import { cn } from "@/lib/utils"

import {
  readLocalChatSelection,
  writeLocalChatSelection,
} from "@/lib/chat/chat-selection-storage"
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
  "How many PDFs do I have?",
  "List my documents",
  "What files did I upload recently?",
  "Show me all my videos",
] as const

function ChatWelcomePanel({
  ready,
  connection,
  serverOnline,
  profilesLoading,
  needsModelSetup,
  onPickSuggestion,
}: {
  ready: boolean
  connection: MobileConnection | null
  serverOnline: boolean
  profilesLoading: boolean
  needsModelSetup: boolean
  onPickSuggestion: (text: string) => void
}) {
  if (!ready || !connection || !serverOnline) {
    return (
      <div className="chat-welcome flex flex-1 flex-col items-center justify-center gap-5 px-6">
        <ArciinMark size="lg" />
        <p className="max-w-[18rem] text-center text-[13px] leading-relaxed text-[#717171]">
          {!connection
            ? "Connect this app to your Arciin server before you can chat with your libraries and files."
            : "Your server isn’t reachable yet. Open server settings when Arciin is running on your network."}
        </p>
        <Link
          href="/profile"
          className="btn-accent-solid rounded-2xl px-6 py-3 text-[13px] font-semibold active:opacity-90"
        >
          {!connection ? "Connect your server" : "Server settings"}
        </Link>
      </div>
    )
  }

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
          className="btn-accent-solid rounded-2xl px-6 py-3 text-[13px] font-semibold active:opacity-90"
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
      <div className="grid w-full max-w-sm grid-cols-2 gap-2 px-1">
        {CHAT_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPickSuggestion(s)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3.5 text-center active:bg-[#f7f7f7]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <span
              className="text-accent flex size-8 shrink-0 items-center justify-center rounded-full border border-[#e5e5e5] bg-white"
              aria-hidden
            >
              <Sparkles className="size-4" />
            </span>
            <span className="text-[11px] leading-snug text-[#717171]">{s}</span>
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
            className="btn-accent-solid flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold active:opacity-90"
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
                          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-accent" />
                        ) : (
                          <MessageSquare
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              active ? "text-accent" : "text-[#a0a0a0]",
                            )}
                          />
                        )}
                        <div className="min-w-0 flex-1 pr-6">
                          <span
                            className={cn(
                              "line-clamp-1 text-[13px] font-semibold",
                              active ? "text-accent" : "text-[#222222]",
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
  connection,
  profileId,
}: {
  content: string
  feedback?: ChatMessageFeedbackRating | null
  canRegenerate: boolean
  onRegenerate?: () => void
  onFeedback?: (rating: ChatMessageFeedbackRating | null) => void
  connection: MobileConnection | null
  profileId?: string | null
}) {
  const btn =
    "flex size-8 items-center justify-center rounded-lg text-[#717171] active:bg-[#f7f7f7]"
  const [copied, setCopied] = useState(false)
  const plain = plainTextFromMessage(content)
  const { speaking, loading: ttsLoading, lastError: ttsError, speak, stop: stopSpeech } =
    useChatTextToSpeech(connection, profileId)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(plain || content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard denied */
    }
  }

  async function handleListen() {
    if (!plain) return
    if (speaking) {
      stopSpeech()
      return
    }
    await speak(plain)
  }

  return (
    <div className="mt-1.5 flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        {onFeedback ? (
        <>
          <button
            type="button"
            className={cn(btn, feedback === "LIKE" && "text-accent")}
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
      <button
        type="button"
        className={cn(btn, (speaking || ttsLoading) && "text-accent")}
        aria-label={speaking ? "Stop read aloud" : "Listen to response"}
        title={speaking ? "Stop" : "Listen"}
        disabled={!plain || ttsLoading}
        onClick={() => void handleListen()}
      >
        {ttsLoading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : speaking ? (
          <Square className="size-3.5 fill-current" />
        ) : (
          <Volume2 className="size-3.5" />
        )}
      </button>
      </div>
      {ttsError ? (
        <p className="max-w-[16rem] text-[10px] leading-snug text-[#b91c1c]">{ttsError}</p>
      ) : null}
    </div>
  )
}

function MessageBubble({
  msg,
  isStreaming = false,
  canRegenerate = false,
  reasoningUiEnabled = true,
  onRegenerate,
  onFeedback,
  connection,
  profileId,
}: {
  msg: ChatMessage
  isStreaming?: boolean
  canRegenerate?: boolean
  reasoningUiEnabled?: boolean
  onRegenerate?: () => void
  onFeedback?: (rating: ChatMessageFeedbackRating | null) => void
  connection: MobileConnection | null
  profileId?: string | null
}) {
  const isUser = msg.role === "user"
  const hasAnswer = hasVisibleAssistantAnswer(msg.content)
  const hasThinkingText = Boolean((msg.thinking ?? "").trim())
  const showReasoning =
    !isUser &&
    reasoningUiEnabled &&
    (hasThinkingText || isStreaming || msg.thinking !== undefined)
  const liveReasoning = Boolean(!isUser && reasoningUiEnabled && isStreaming)
  const hideAnswerBubble =
    !isUser && !hasAnswer && (showReasoning || (msg.pending && isStreaming))
  const showWorking =
    !isUser && msg.pending && !hasAnswer && !hasThinkingText && !isStreaming
  const showActions = !isUser && !msg.pending && !isStreaming && hasAnswer

  return (
    <div
      className={cn(
        "flex w-full gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-accent text-on-accent" : "text-accent border border-[#e5e5e5] bg-white",
        )}
      >
        {isUser ? <User className="size-4" /> : <Sparkles className="size-4" />}
      </div>

      <div
        className={cn(
          "min-w-0 flex flex-col",
          isUser ? "max-w-[85%] items-end" : "max-w-[calc(100%-2.75rem)] flex-1 items-start",
        )}
      >
        {showReasoning ? (
          <ChatReasoningBlock content={msg.thinking ?? ""} live={liveReasoning} />
        ) : null}

        {!hideAnswerBubble ? (
          <div
            className={cn(
              "min-w-0 rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
              isUser
                ? "bg-accent text-on-accent rounded-tr-sm shadow-sm"
                : "rounded-tl-sm border border-[#e5e5e5] bg-[#fafafa]/90 text-[#222222] shadow-[0_1px_6px_rgba(0,0,0,0.04)]",
            )}
          >
            {showWorking ? (
              <span className="flex items-center gap-2 text-[#717171]">
                <Loader2 className="size-3.5 animate-spin text-accent" />
                Working…
              </span>
            ) : isUser ? (
              <span className="whitespace-pre-wrap break-words">{msg.content}</span>
            ) : (
              <div className="min-w-0">
                <ChatMarkdownContent content={msg.content} />
                {isStreaming && hasAnswer ? (
                  <span
                    className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-px animate-pulse bg-accent opacity-80 align-middle"
                    aria-hidden
                  />
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {showActions ? (
          <MessageActions
            content={msg.content}
            feedback={msg.feedback}
            canRegenerate={canRegenerate}
            onRegenerate={onRegenerate}
            onFeedback={onFeedback}
            connection={connection}
            profileId={profileId}
          />
        ) : null}
      </div>
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
  const { connection, ready, serverReachable, serverOnline } = useServerOnline()
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
  const [statusNote, setStatusNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [planGate, setPlanGate] = useState<string | null>(null)

  const [chatContext, setChatContext] = useState<ChatInstanceContext | null>(null)
  const [showThinking, setShowThinking] = useState(true)

  const pageRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesInnerRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const wasStreamingRef = useRef(false)
  const composerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useChatKeyboard(pageRef, composerRef)

  const reasoningUiEnabled = showThinking

  useEffect(() => {
    return () => forceResetChatKeyboard(pageRef.current, composerRef.current)
  }, [])

  useEffect(() => {
    if (!connection || !ready) return
    let cancelled = false
    void getAiSettings(connection)
      .then((settings) => {
        if (!cancelled) setShowThinking(settings.showThinking)
      })
      .catch(() => {
        /* non-admins may not read instance AI settings — keep default */
      })
    return () => {
      cancelled = true
    }
  }, [connection, ready])

  useEffect(() => {
    const page = pageRef.current
    const composer = composerRef.current
    if (!page || !composer) return

    const syncComposerInset = () => {
      const h = Math.ceil(composer.getBoundingClientRect().height)
      page.style.setProperty("--chat-composer-inset", `${h}px`)
    }

    syncComposerInset()
    const ro = new ResizeObserver(syncComposerInset)
    ro.observe(composer)
    return () => ro.disconnect()
  }, [])

  const [selectedProfile, setSelectedProfile] = useState<ChatProfile | null>(null)
  const [selectedModel, setSelectedModel] = useState("")

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current
    if (!el || !stickToBottomRef.current) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const handleMessagesScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = dist < 100
  }, [])

  useLayoutEffect(() => {
    scrollToBottom("auto")
  }, [messages, streaming, scrollToBottom])

  useEffect(() => {
    const outer = scrollRef.current
    const inner = messagesInnerRef.current
    if (!outer || !inner) return

    const bump = () => {
      if (!stickToBottomRef.current) return
      outer.scrollTo({ top: outer.scrollHeight, behavior: "auto" })
    }

    const ro = new ResizeObserver(bump)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [messages.length])

  useLayoutEffect(() => {
    if (wasStreamingRef.current && !streaming) {
      // Only snap to bottom if the user was already there — never FORCE it, or
      // scrolling up right after a reply yanks them back down. Use "auto" (not
      // "smooth"): on iOS a programmatic smooth scroll swallows touch events
      // for its whole animation, which reads as "can't scroll up".
      if (stickToBottomRef.current) {
        const el = scrollRef.current
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" })
      }
    }
    wasStreamingRef.current = streaming
  }, [streaming])

  const selectedProfileRef = useRef<ChatProfile | null>(null)
  const selectedModelRef = useRef("")
  selectedProfileRef.current = selectedProfile
  selectedModelRef.current = selectedModel

  const applyProfileSelection = useCallback(
    (_list: ChatProfile[], profile: ChatProfile, model: string) => {
      const resolved = model.trim() || profile.defaultModel?.trim() || ""
      setSelectedProfile(profile)
      setSelectedModel(resolved)
      if (resolved) writeLocalChatSelection(profile.id, resolved)
    },
    [],
  )

  const loadProfiles = useCallback(
    async (opts?: { refreshOnly?: boolean }) => {
      if (!connection || !serverOnline) {
        setProfilesLoading(false)
        return
      }
      setProfilesLoading(true)
      try {
        const list = await getChatProfiles(connection)
        setProfiles(list)
        if (list.length === 0) {
          setSelectedProfile(null)
          setSelectedModel("")
          setStatusNote("No AI model configured — add one in Arciin Models")
          return
        }

        if (opts?.refreshOnly) {
          const current = selectedProfileRef.current
          if (current && list.some((p) => p.id === current.id)) {
            setStatusNote("")
            setError(null)
            return
          }
        }

        const [remote, local] = await Promise.all([
          getChatSelection(connection).catch(() => null),
          Promise.resolve(readLocalChatSelection()),
        ])

        let profile: ChatProfile | undefined
        let preferredModel: string | null = null

        if (remote?.profileId) {
          profile = list.find((p) => p.id === remote.profileId)
          preferredModel = remote.model ?? null
          if (profile && remote.model) {
            writeLocalChatSelection(profile.id, remote.model)
          }
        }
        if (!profile && local?.profileId) {
          profile = list.find((p) => p.id === local.profileId)
          preferredModel = local.model || preferredModel
        }
        if (!profile) {
          profile = list.find((p) => p.isDefault) ?? list[0]
        }

        const model = await resolveChatModelForProfile(connection, profile, preferredModel)
        applyProfileSelection(list, profile, model)

        if ((!remote?.profileId || !remote?.model?.trim()) && model.trim()) {
          void setChatSelection(connection, {
            profileId: profile.id,
            model: model.trim(),
          }).catch(() => {})
        } else if (isOllamaProvider(profile.provider) && !model.trim()) {
          setStatusNote("Open the model picker and choose an Ollama model")
        }
        setStatusNote("")
        setError(null)
      } catch (err) {
        if (isLicenseRequiredError(err)) {
          setPlanGate(licenseRequiredPlan(err) ?? "pro")
          setStatusNote("")
          return
        }
        const msg = formatApiError(err, serverHint(connection))
        setError(suppressFetchErrorWhenOffline(serverReachable, msg))
        setStatusNote("")
      } finally {
        setProfilesLoading(false)
      }
    },
    [applyProfileSelection, connection, serverOnline, serverReachable],
  )

  const loadHistory = useCallback(async () => {
    if (!connection) return
    setHistoryLoading(true)
    try {
      const list = await getChatConversations(connection)
      setConversations(list)
    } catch (err) {
      if (isLicenseRequiredError(err)) {
        setPlanGate(licenseRequiredPlan(err) ?? "pro")
        return
      }
      const msg = formatApiError(err, serverHint(connection))
      setError(suppressFetchErrorWhenOffline(serverReachable, msg))
    } finally {
      setHistoryLoading(false)
    }
  }, [connection, serverReachable])

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
    if (!serverOnline) {
      setProfilesLoading(false)
      setError(null)
      return
    }
    void loadProfiles()
    void loadHistory()
    void loadChatContext()
  }, [ready, connection, serverOnline, loadProfiles, loadHistory, loadChatContext])

  useEffect(() => {
    if (serverReachable === false) setError(null)
  }, [serverReachable])

  useEffect(() => {
    if (!connection) return
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadProfiles({ refreshOnly: true })
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
    stickToBottomRef.current = true
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
          .map((m) => {
            const base = {
              id: m.id,
              dbId: m.id,
              role: m.role as "user" | "assistant",
              feedback: m.feedbackRating ?? null,
              usage: m.totalTokens
                ? {
                    inputTokens: m.inputTokens ?? 0,
                    outputTokens: m.outputTokens ?? 0,
                    totalTokens: m.totalTokens,
                  }
                : undefined,
            }
            if (m.role === "assistant") {
              const resolved = resolveFinalAssistantMessage(
                m.content,
                "",
                showThinking,
                reasoningUiEnabled,
              )
              return {
                ...base,
                content: resolved.content,
                thinking: resolved.thinking,
              }
            }
            return { ...base, content: m.content }
          }),
      )
      setHistoryOpen(false)
      stickToBottomRef.current = true
    } catch (err) {
      const msg = formatApiError(err, serverHint(connection))
      setError(suppressFetchErrorWhenOffline(serverReachable, msg))
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
      opts?: {
        conversationId?: string | null
        pendingUserId?: string
        userText?: string
        priorMessages?: { role: string; content: string }[]
      },
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

      const userText =
        opts?.userText ??
        [...history].reverse().find((m) => m.role === "user")?.content ??
        ""
      const priorMessages = opts?.priorMessages ?? history.slice(0, -1)

      let contextForSend = chatContext
      if (!contextForSend) {
        try {
          contextForSend = await getChatInstanceContext(connection)
          setChatContext(contextForSend)
        } catch {
          /* send without instance snapshot */
        }
      }

      const apiBase = connection.apiBaseUrl ?? connection.webUrl ?? ""
      const payload = buildOutboundChatMessages(
        history,
        ARCIIN_MOBILE_SYSTEM_INSTRUCTION,
        contextForSend,
        apiBase,
      )

      abortRef.current = new AbortController()
      let usage: TokenUsage | undefined
      let textAccum = ""
      let thinkingAccum = ""

      const pushStreamState = () => {
        const derived = deriveStreamingThinkingAndAnswer(
          textAccum,
          thinkingAccum,
          showThinking,
        )
        const mergedAnswer = mergeAssetTagsFromThinking(derived.answer, derived.thinking)
        const displayContent = normalizeAssistantDisplayText(mergedAnswer)
        const thinkingRaw = displayThinkingDuringStream(reasoningUiEnabled, derived)
        const thinking = thinkingRaw
          ? stripAssetTagsFromText(thinkingRaw) || (derived.inReasoningBlock ? "" : undefined)
          : undefined
        flushSync(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: displayContent,
                    thinking,
                    pending: false,
                  }
                : m,
            ),
          )
        })
      }

      const streamResult = await streamChatWithCheck(
        connection,
        {
          profileId: profile.id,
          model: modelToSend,
          messages: payload,
        },
        {
          signal: abortRef.current.signal,
          onText: (chunk) => {
            textAccum += chunk
            pushStreamState()
          },
          onThinking: (chunk) => {
            thinkingAccum += chunk
            pushStreamState()
          },
          onUsage: (u) => {
            usage = u
          },
          onLibraryAction: () => {
            void loadChatContext()
          },
        },
      )

      const resolved = resolveFinalAssistantMessage(
        streamResult.text,
        streamResult.thinking,
        showThinking,
        reasoningUiEnabled,
      )
      const content = finalizeAssistantContent(resolved.content, userText, priorMessages, {
        documentFiles: contextForSend?.documentFiles,
      })

      flushSync(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content,
                  thinking: resolved.thinking,
                  pending: false,
                }
              : m,
          ),
        )
      })

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
              ? {
                  ...m,
                  content,
                  thinking: resolved.thinking,
                  usage,
                  pending: false,
                }
              : m,
          ),
        )
        void loadHistory()
      }

      return { content, usage }
    },
    [
      chatContext,
      connection,
      conversationId,
      loadChatContext,
      loadHistory,
      reasoningUiEnabled,
      selectedModel,
      selectedProfile,
      showThinking,
    ],
  )

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming || !connection || !selectedProfile || !serverOnline || planGate) return

    const modelToSend =
      selectedModel.trim() || selectedProfile.defaultModel?.trim() || ""
    if (!modelToSend) {
      setError(
        isOllamaProvider(selectedProfile.provider)
          ? "Choose an Ollama model from the model picker (boxes icon below)."
          : "No model configured for this provider. Set one under Models.",
      )
      return
    }

    const userMsg: ChatMessage = { id: createId(), role: "user", content: text }
    const assistantId = createId()
    const pendingMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      thinking: "",
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
    forceResetChatKeyboard(pageRef.current, composerRef.current)
    setError(null)
    stickToBottomRef.current = true
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
        userText: text,
        priorMessages: priorMessages.map((m) => ({ role: m.role, content: m.content })),
      })
      setStatusNote("")
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content))
      } else {
        const msg = formatChatProviderError(formatApiError(err, serverHint(connection)))
        setError(suppressFetchErrorWhenOffline(serverReachable, msg))
        setStatusNote(isNetworkError(err) && serverReachable !== false ? "Send failed" : "")
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      forceResetChatKeyboard(pageRef.current, composerRef.current)
    }
  }

  async function regenerateAssistantMessage(assistantMsgId: string) {
    if (streaming || !connection || !selectedProfile || !serverOnline) return
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
      thinking: "",
      pending: true,
    }

    setError(null)
    stickToBottomRef.current = true
    setMessages([...priorMessages, pendingMsg])
    setStreaming(true)
    setStatusNote("Regenerating…")

    const history = priorMessages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content.trim() }))

    try {
      await runAssistantStream(assistantId, history, {
        conversationId,
        userText: userMsg.content,
        priorMessages: priorMessages.map((m) => ({ role: m.role, content: m.content })),
      })
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content))
      } else {
        const msg = formatChatProviderError(formatApiError(err, serverHint(connection)))
        setError(suppressFetchErrorWhenOffline(serverReachable, msg))
        setStatusNote(isNetworkError(err) && serverReachable !== false ? "Regenerate failed" : "")
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      setStatusNote("")
    }
  }

  const showWelcome = messages.length === 0
  const needsModelSetup = serverOnline && !profilesLoading && profiles.length === 0
  const hasModel = Boolean(selectedProfile)
  const canSend =
    Boolean(input.trim()) && !streaming && hasModel && !profilesLoading && serverOnline
  const canStop = streaming && hasModel && serverOnline
  const composerFooter = chatComposerFooterNote({
    serverOnline,
    profilesLoading,
    streaming,
    hasModel,
    activityNote: statusNote || undefined,
  })
  const composerPlaceholder = chatComposerPlaceholder({
    serverOnline,
    profilesLoading,
    streaming,
    hasModel,
  })
  const visibleChatError = suppressFetchErrorWhenOffline(serverReachable, error)

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

      {visibleChatError ? (
        <div className="chat-page-error" role="alert">
          {visibleChatError}
          <button
            type="button"
            onClick={() => setError(null)}
            className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-lg text-[#b91c1c] active:bg-[#fee2e2]"
            aria-label="Dismiss error"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleMessagesScroll}
        className="chat-page-messages flex flex-1 flex-col gap-3 scrollbar-hide"
      >
        {planGate ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-6 text-center">
            <LockIcon
              className="mb-1.5 size-8"
              style={{ color: "color-mix(in srgb, var(--arciin-accent, #ff4f12) 45%, transparent)" }}
              aria-hidden
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <p className="text-[13px] font-medium text-[#222222]">
                Full AI Chat is available on Pro
              </p>
              <PlanBadge plan={planGate} />
            </div>
            <p className="max-w-[38ch] text-[12px] leading-relaxed text-[#a0a0a0]">
              Free lets you connect and test one Ollama model from the Models page. Upgrade to
              Pro to chat with files, analyze PDFs and images, and use multiple AI providers.
            </p>
            <Link
              href="/models"
              className="btn-accent-solid mt-2 rounded-xl px-4 py-2 text-[12px] font-semibold active:opacity-90"
            >
              Test Ollama model
            </Link>
          </div>
        ) : showWelcome ? (
          <ChatWelcomePanel
            ready={ready}
            connection={connection}
            serverOnline={serverOnline}
            profilesLoading={profilesLoading}
            needsModelSetup={needsModelSetup}
            onPickSuggestion={setInput}
          />
        ) : (
          <div ref={messagesInnerRef} className="flex flex-col gap-3 pb-2">
            {(() => {
              const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id
              return messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  reasoningUiEnabled={reasoningUiEnabled}
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
                  connection={connection}
                  profileId={selectedProfile?.id}
                />
              ))
            })()}
          </div>
        )}
      </div>

      <div ref={composerRef} className="chat-page-composer">
        <div
          className="flex items-center gap-2 rounded-2xl bg-white px-2 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          {connection && profiles.length > 0 && serverOnline ? (
            <ChatModelBar
              variant="composer"
              connection={connection}
              profiles={profiles}
              selectedProfile={selectedProfile}
              selectedModel={selectedModel}
              loading={profilesLoading}
              onSelect={(profile, model) => {
                applyProfileSelection(profiles, profile, model)
                const resolved = model.trim() || profile.defaultModel?.trim() || ""
                if (resolved) {
                  void setChatSelection(connection, {
                    profileId: profile.id,
                    model: resolved,
                  }).catch(() => {})
                }
              }}
            />
          ) : null}
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onFocus={() => {
              requestAnimationFrame(() => {
                syncChatKeyboardOffset(pageRef.current, composerRef.current)
                scrollToBottom()
              })
            }}
            onBlur={() => {
              window.setTimeout(() => {
                forceResetChatKeyboard(pageRef.current, composerRef.current)
              }, 120)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (streaming) stopGeneration()
                else void sendMessage()
              }
            }}
            placeholder={composerPlaceholder}
            disabled={profilesLoading || !hasModel || !serverOnline}
            className="chat-composer-input max-h-[120px] min-h-[24px] min-w-0 flex-1 resize-none bg-transparent py-1 text-[#222222] outline-none placeholder:text-[#a0a0a0] disabled:opacity-50"
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
              className="btn-accent-solid flex size-9 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-[15px] text-white" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[11px] leading-snug text-[#a0a0a0]">
          {streaming && statusNote ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-2.5 animate-spin" />
              {statusNote}
            </span>
          ) : (
            composerFooter
          )}
        </p>
      </div>
    </div>
  )
}
