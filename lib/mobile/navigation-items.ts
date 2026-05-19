import type { LucideIcon } from "lucide-react"
import {
  BriefcaseBusiness,
  CloudUpload,
  Database,
  Files,
  GalleryVerticalEnd,
  LayoutGrid,
  Bell,
  MonitorDot,
  Settings,
  Sparkles,
  User,
} from "lucide-react"

export type MobileNavItem = {
  title: string
  href: string
  icon: LucideIcon
  keywords?: string
}

export const MOBILE_JUMP_NAV: MobileNavItem[] = [
  { title: "Home", href: "/home", icon: LayoutGrid, keywords: "overview dashboard" },
  { title: "Files", href: "/files", icon: Files, keywords: "assets libraries upload" },
  { title: "Database", href: "/database", icon: Database },
  { title: "Chat", href: "/chat", icon: Sparkles, keywords: "ai assistant" },
  { title: "Profile", href: "/profile", icon: User, keywords: "account settings" },
  { title: "Jobs", href: "/jobs", icon: BriefcaseBusiness, keywords: "background queue worker" },
  { title: "Events", href: "/events", icon: GalleryVerticalEnd, keywords: "socket monitor stream" },
  { title: "Activity", href: "/activity", icon: MonitorDot, keywords: "timeline feed log" },
  { title: "Uploads", href: "/files", icon: CloudUpload, keywords: "upload queue sessions" },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Settings", href: "/profile", icon: Settings, keywords: "preferences integrations api keys storage" },
]

export function filterMobileNavItems(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return MOBILE_JUMP_NAV.slice(0, 8)
  return MOBILE_JUMP_NAV.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.href.toLowerCase().includes(q) ||
      item.keywords?.toLowerCase().includes(q),
  )
}
