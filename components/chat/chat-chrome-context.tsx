"use client"

import { createContext, useContext, useMemo, useState } from "react"

type ChatChromeModel = {
  onOpenHistory: () => void
}

type ChatChromeContextValue = {
  chrome: ChatChromeModel | null
  setChrome: (chrome: ChatChromeModel | null) => void
}

const ChatChromeContext = createContext<ChatChromeContextValue | null>(null)

export function ChatChromeProvider({ children }: { children: React.ReactNode }) {
  const [chrome, setChrome] = useState<ChatChromeModel | null>(null)
  const value = useMemo(() => ({ chrome, setChrome }), [chrome])
  return <ChatChromeContext.Provider value={value}>{children}</ChatChromeContext.Provider>
}

export function useChatChrome() {
  const ctx = useContext(ChatChromeContext)
  if (!ctx) throw new Error("useChatChrome must be used within ChatChromeProvider")
  return ctx
}

export function useChatChromeOptional() {
  return useContext(ChatChromeContext)
}
