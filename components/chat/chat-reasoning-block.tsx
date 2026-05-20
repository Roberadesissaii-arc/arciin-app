"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ChevronDown, Loader2, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

export function ChatReasoningBlock({ content, live }: { content: string; live: boolean }) {
  const [expanded, setExpanded] = useState(live)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    if (live) setExpanded(true)
  }, [live])

  useEffect(() => {
    if (live) stickToBottomRef.current = true
  }, [live])

  const showBody = expanded && (content.length > 0 || live)

  useLayoutEffect(() => {
    if (!showBody || !live) return
    const el = scrollRef.current
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [content, live, showBody])

  return (
    <div
      className="mb-2 max-w-[92%] overflow-hidden rounded-xl bg-[#f7f7f7] text-[12px]"
      style={{ border: "1px solid #e8e8e8" }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {live ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-[#ff4f12]" />
        ) : (
          <Sparkles className="size-3 shrink-0 text-[#a0a0a0]" />
        )}
        <span className="flex-1 text-[11px] font-medium text-[#717171]">
          {live ? "Reasoning" : "Reasoning"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-[#a0a0a0] transition-transform",
            expanded ? "rotate-180" : "",
          )}
        />
      </button>
      {showBody ? (
        <div
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current
            if (!el) return
            stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 72
          }}
          className="max-h-[min(36vh,280px)] overflow-y-auto border-t border-[#ececec] px-3 py-2.5 text-[11px] leading-relaxed text-[#717171] scrollbar-hide"
        >
          {content ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : live ? (
            <p className="italic text-[#a0a0a0]">…</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
