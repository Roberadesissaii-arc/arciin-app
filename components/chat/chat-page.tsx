"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import {
  createChatConversation,
  deleteChatConversation,
  getChatConversation,
  getChatConversations,
  getChatProfiles,
  getChatSelection,
  saveChatMessages,
  streamChat,
} from "@/lib/api/chat"
import { formatApiError } from "@/lib/api/errors"
import type { ChatConversationSummary, ChatMessage, ChatProfile } from "@/lib/types/chat"
import { relativeTime } from "@/lib/utils/relative-time"
import { cn } from "@/lib/utils"

import { createId } from "@/lib/utils/create-id"

function titleFromMessage(text: string) {
  const t = text.trim().replace(/\s+/g, " ")
  return t.length > 48 ? `${t.slice(0, 48)}…` : t || "New chat"
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
}: {
  open: boolean
  onClose: () => void
  conversations: ChatConversationSummary[]
  activeId: string | null
  loading: boolean
  loadingId: string | null
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
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(convo.id)
                        }}
                        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg text-[#c0c0c0] active:bg-[#fee2e2] active:text-[#b91c1c]"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="size-3.5" />
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

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user"

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
          isUser
            ? "rounded-br-md bg-[#ff4f12] text-white"
            : "rounded-bl-md bg-white text-[#222222]",
        )}
        style={isUser ? undefined : { border: "1px solid #e5e5e5" }}
      >
        {msg.pending && !msg.content ? (
          <span className="flex items-center gap-2 text-[#717171]">
            <Loader2 className="size-3.5 animate-spin" />
            Thinking…
          </span>
        ) : (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ChatPage() {
  const { connection, ready } = useConnection()
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

  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      const model = remote?.model || profile.defaultModel || ""
      applyProfileSelection(list, profile, model)
      setStatusNote("Chat connects to your Arciin API")
    } catch (err) {
      setError(formatApiError(err))
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
      setError(formatApiError(err))
    } finally {
      setHistoryLoading(false)
    }
  }, [connection])

  useEffect(() => {
    if (!ready || !connection) return
    void loadProfiles()
    void loadHistory()
  }, [ready, connection, loadProfiles, loadHistory])

  useEffect(() => {
    if (historyOpen && connection) void loadHistory()
  }, [historyOpen, connection, loadHistory])

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
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
      )
      setHistoryOpen(false)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoadingConvoId(null)
    }
  }

  async function handleDeleteConversation(id: string) {
    if (!connection) return
    try {
      await deleteChatConversation(connection, id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (conversationId === id) startNewChat()
    } catch (err) {
      setError(formatApiError(err))
    }
  }

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

    const modelToSend = selectedModel.trim() || profile.defaultModel || undefined

    setInput("")
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
        await saveChatMessages(connection, {
          conversationId: created.id,
          messages: [{ role: "user", content: text }],
        })
        void loadHistory()
      } else {
        await saveChatMessages(connection, {
          conversationId: activeConvoId,
          messages: [{ role: "user", content: text }],
        })
      }

      const history = [...priorMessages, userMsg]
        .filter((m) => m.content.trim().length > 0)
        .map((m) => ({
          role: m.role,
          content: m.content.trim(),
        }))

      abortRef.current = new AbortController()
      let accumulated = ""

      await streamChat(
        connection,
        {
          profileId: profile.id,
          model: modelToSend,
          messages: history,
        },
        {
          signal: abortRef.current.signal,
          onText: (chunk) => {
            accumulated += chunk
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: accumulated, pending: false }
                  : m,
              ),
            )
          },
        },
      )

      if (accumulated.trim() && activeConvoId) {
        await saveChatMessages(connection, {
          conversationId: activeConvoId,
          messages: [{ role: "assistant", content: accumulated }],
        })
        void loadHistory()
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content))
      } else {
        const msg = formatApiError(err)
        setError(msg)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: msg, pending: false } : m,
          ),
        )
      }
    } finally {
      setStreaming(false)
      setStatusNote(
        profiles.length === 0
          ? "No AI model configured — add one in Arciin Models"
          : "Chat connects to your Arciin API",
      )
      abortRef.current = null
    }
  }

  const showWelcome = messages.length === 0
  const canSend = Boolean(input.trim()) && !streaming && selectedProfile && !profilesLoading

  return (
    <div className="flex flex-col gap-5">
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        activeId={conversationId}
        loading={historyLoading}
        loadingId={loadingConvoId}
        onSelect={(id) => void openConversation(id)}
        onNew={startNewChat}
        onDelete={(id) => void handleDeleteConversation(id)}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            className="text-[22px] font-bold tracking-tight text-[#222222]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            Chat
          </h2>
          <p className="mt-0.5 text-[13px] text-[#717171]">
            Ask about your files, libraries, and instance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#717171] active:opacity-70"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Chat history"
        >
          <Clock className="size-4" />
        </button>
      </div>

      {error ? (
        <div
          className="rounded-xl px-3 py-2 text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </div>
      ) : null}

      {/* Messages — extra top padding pushes content below header */}
      <div ref={scrollRef} className="mobile-chat-scroll-pad flex flex-col gap-3 scrollbar-hide">
        {showWelcome ? (
          <div className="flex flex-col items-center gap-5 pt-6">
            <div
              className="flex size-16 items-center justify-center rounded-3xl bg-[#f7f7f7]"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <Sparkles className="size-7 text-[#ff4f12]" />
            </div>
            <div className="max-w-xs space-y-2 text-center">
              <h3
                className="text-[18px] font-bold text-[#222222]"
                style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
              >
                AI Chat
              </h3>
              <p className="text-[13px] leading-relaxed text-[#717171]">
                Ask about your files, libraries, or instance.
              </p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-2">
              {[
                "What files did I upload recently?",
                "How much storage am I using?",
                "Show me all my videos",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left active:bg-[#f7f7f7]"
                  style={{ border: "1px solid #e5e5e5" }}
                >
                  <Sparkles className="size-3.5 shrink-0 text-[#a0a0a0]" />
                  <span className="text-[12px] text-[#717171]">{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </div>
        )}
      </div>

      <div className="mobile-composer-fixed pointer-events-none">
        <div
          className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder={
              streaming
                ? "Generating…"
                : profilesLoading
                  ? "Loading…"
                  : "Ask anything…"
            }
            disabled={streaming || profilesLoading || !selectedProfile}
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[#222222] outline-none placeholder:text-[#a0a0a0] disabled:opacity-50"
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={() => void sendMessage()}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#ff4f12" }}
            aria-label="Send"
          >
            {streaming ? (
              <Loader2 className="size-4 animate-spin text-white" />
            ) : (
              <Send className="size-[15px] text-white" />
            )}
          </button>
        </div>
        <p className="pointer-events-none mt-2 text-center text-[10px] text-[#a0a0a0]">
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
          ) : (
            statusNote
          )}
        </p>
      </div>
    </div>
  )
}
