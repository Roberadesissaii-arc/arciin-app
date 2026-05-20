"use client"

import { usePathname, useRouter } from "next/navigation"
import { ChevronLeft, Clock } from "lucide-react"

import { useChatChromeOptional } from "@/components/chat/chat-chrome-context"

/** Chat top bar — matches Files/Models safe-area spacing. */
export function ChatMobileHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const ctx = useChatChromeOptional()

  if (pathname !== "/chat" && !pathname.startsWith("/chat/")) return null

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push("/home")
    }
  }

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-[#e5e5e5] bg-[#f7f7f7] pt-safe">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-2">
        <button
          type="button"
          onClick={goBack}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#222222] active:opacity-70"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Go back"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p
          className="min-w-0 flex-1 truncate text-center text-[16px] font-bold text-[#222222]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          Chat
        </p>
        <button
          type="button"
          onClick={() => ctx?.chrome?.onOpenHistory()}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#717171] active:opacity-70"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Chat history"
        >
          <Clock className="size-4" />
        </button>
      </div>
    </header>
  )
}
