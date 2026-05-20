"use client"

import { usePathname, useRouter } from "next/navigation"
import { ChevronLeft, Clock } from "lucide-react"

import { useChatChromeOptional } from "@/components/chat/chat-chrome-context"

/** Floating back + history — no title bar. */
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
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 pt-safe">
      <div className="flex items-start justify-between gap-2 px-3 pb-1 pt-2">
        <button
          type="button"
          onClick={goBack}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white/95 text-[#222222] shadow-md backdrop-blur-sm active:opacity-80"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          aria-label="Go back"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => ctx?.chrome?.onOpenHistory()}
          className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-white/95 text-[#717171] shadow-md backdrop-blur-sm active:opacity-80"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          aria-label="Chat history"
        >
          <Clock className="size-4" />
        </button>
      </div>
    </div>
  )
}
