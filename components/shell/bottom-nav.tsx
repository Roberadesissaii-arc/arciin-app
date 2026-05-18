"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Database, Files, LayoutGrid, Sparkles, User } from "lucide-react"

const ALL_ITEMS = [
  { href: "/home", label: "Home", icon: LayoutGrid },
  { href: "/database", label: "Database", icon: Database },
  { href: "/chat", label: "Chat", icon: Sparkles },
  { href: "/files", label: "Files", icon: Files },
  { href: "/profile", label: "Profile", icon: User },
] as const

function isActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main navigation"
      className="mobile-bottom-nav pointer-events-auto fixed inset-x-4 z-50 flex h-16 items-center rounded-3xl border border-[#2a2a2a] bg-[#111111] shadow-[0_4px_28px_rgba(0,0,0,0.22)]"
    >
      {ALL_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href)
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
              style={{ color: active ? "#ff4f12" : "#666666" }}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: active ? "#ff4f12" : "#666666", letterSpacing: "0.02em" }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
