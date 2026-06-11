"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import { Boxes, Files, LayoutGrid, Sparkles, User } from "lucide-react"

import { useBottomNavViewport } from "@/hooks/use-bottom-nav-viewport"
import { isBottomNavActive } from "@/lib/mobile/bottom-nav-active"

const ALL_ITEMS = [
  { href: "/home", label: "Home", icon: LayoutGrid },
  { href: "/models", label: "Models", icon: Boxes },
  { href: "/chat", label: "Chat", icon: Sparkles },
  { href: "/files", label: "Files", icon: Files },
  { href: "/profile", label: "Profile", icon: User },
] as const

/** Floating bottom nav — portaled to body so sheets/keyboard cannot shift it. */
export function BottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/")

  useEffect(() => {
    setMounted(true)
  }, [])

  useBottomNavViewport(navRef, mounted && !isChat)

  if (isChat) {
    return null
  }

  if (!mounted) return null

  return createPortal(
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className="mobile-bottom-nav mobile-bottom-nav-portal pointer-events-auto flex h-16 items-center rounded-3xl border border-[#2a2a2a] bg-[#111111] shadow-[0_4px_28px_rgba(0,0,0,0.22)]"
    >
      {ALL_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isBottomNavActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1 transition-opacity active:opacity-60"
          >
            <Icon
              className="size-[22px]"
              style={{ color: active ? "var(--arciin-accent, #ff4f12)" : "#666666" }}
            />
            <span
              className="text-[10px] font-semibold"
              style={{
                color: active ? "var(--arciin-accent, #ff4f12)" : "#666666",
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>,
    document.body,
  )
}
