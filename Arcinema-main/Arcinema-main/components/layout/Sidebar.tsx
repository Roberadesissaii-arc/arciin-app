/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Search,
  Compass,
  BookMarked,
  Heart,
  Activity,
  History,
  Share2,
  Download,
  BookOpen,
  Settings,
  Bell,
  LogOut,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SIDEBAR_COLLAPSED_PX, SIDEBAR_EXPANDED_PX } from "@/lib/layout/sidebarDimensions";
import { onSnapshot, doc } from "firebase/firestore";
import { projectFirestore as db } from "@/firebase/config";
import { getAvatarPath } from "@/lib/utils/profileAvatars";

// ─── colour tokens (exact match of arceclaw_example) ────────────────────────
const SB_BG      = "#08080d";
const BORDER     = "rgba(255,255,255,0.07)";
const DIVIDER    = "rgba(255,255,255,0.06)";
const TEXT_OFF   = "rgba(255,255,255,0.5)";
const TEXT_ON    = "rgba(255,255,255,0.95)";
const TEXT_SECT  = "rgba(255,255,255,0.3)";
const ACTIVE_BG  = "rgba(255,255,255,0.08)";
const HOVER_BG   = "rgba(255,255,255,0.04)";
const COUNT_BG   = "rgba(255,255,255,0.07)";
const COUNT_TEXT = "rgba(255,255,255,0.45)";
const PURPLE     = "var(--accent-color, #5D5FEF)";

// ─── nav definition (mirrors arceclaw NAV exactly: 4 flat, divider, section, divider, 8 flat) ──
type FlatItem    = { kind: "flat";    id: string; label: string; icon: any; href: string; count?: number }
type SectionItem = { kind: "section"; id: string; label: string; icon: any; children: { id: string; label: string; href: string }[] }
type DividerItem = { kind: "divider"; id: string }
type NavEntry    = FlatItem | SectionItem | DividerItem

const NAV: NavEntry[] = [
  { kind: "flat",    id: "home",         label: "Home",          icon: LayoutDashboard, href: "/"                    },
  { kind: "flat",    id: "cineai",       label: "CineAI",        icon: MessageSquare,   href: "/cineai"              },
  { kind: "flat",    id: "search",       label: "Search",        icon: Search,          href: "/search"              },
  { kind: "flat",    id: "new_releases", label: "New Releases",  icon: Calendar,        href: "/new-releases"        },
  { kind: "divider", id: "d1" },
  { kind: "section", id: "browse", label: "Browse", icon: Compass, children: [
    { id: "movies",   label: "Movies",    href: "/movies"    },
    { id: "tvshows",  label: "TV Shows",  href: "/tv-shows"  },
    { id: "anime",    label: "Anime",     href: "/anime"     },
    { id: "books",    label: "Books",     href: "/books"     },
  ]},
  { kind: "divider", id: "d2" },
  { kind: "flat",    id: "my_list",   label: "My List",        icon: BookMarked, href: "/user/my-list"          },
  { kind: "flat",    id: "favorites", label: "Favorites",      icon: Heart,      href: "/user/likes"            },
  { kind: "flat",    id: "activity",  label: "Activity",       icon: Activity,   href: "/user/activity"         },
  { kind: "flat",    id: "history",   label: "Watch History",  icon: History,    href: "/user/watch-history"    },
  { kind: "flat",    id: "folders",   label: "Shared Folders", icon: Share2,     href: "/user/shared-folders"   },
  { kind: "flat",    id: "downloads", label: "Downloads",      icon: Download,   href: "/user/downloads"        },
]

// bottom mirrors arceclaw BOTTOM exactly: Docs, Settings, Notifications
const BOTTOM: FlatItem[] = [
  { kind: "flat", id: "help",          label: "Help",          icon: BookOpen, href: "/cineai"          },
  { kind: "flat", id: "settings",      label: "Settings",      icon: Settings, href: "/user/settings"   },
  { kind: "flat", id: "notifications", label: "Notifications", icon: Bell,     href: "/notifications"   },
]

// ─── component ───────────────────────────────────────────────────────────────
export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const { user, logoutUser } = useAuth();
  const unreadCount = useNotificationCount();
  const [openSections, setOpenSections] = useState<string[]>(["browse"]);

  const isCollapsed = !sidebarOpen;
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Guest";
  const [avatarId, setAvatarId] = useState<string | undefined>();

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists() && snap.data().avatarId) setAvatarId(snap.data().avatarId);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ── flat link ─────────────────────────────────────────────────────────────
  const renderFlat = (item: FlatItem) => {
    const active = item.href === "/"
      ? pathname === "/"
      : pathname?.startsWith(item.href);
    const count = item.id === "notifications" ? unreadCount : item.count;

    return (
      <Link
        key={item.id}
        href={item.href}
        className={cn(
          "group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors select-none",
          isCollapsed && "justify-center px-0 w-10 mx-auto"
        )}
        style={{ background: active ? ACTIVE_BG : "transparent", color: active ? TEXT_ON : TEXT_OFF }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = HOVER_BG;
            (e.currentTarget as HTMLElement).style.color = TEXT_ON;
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = TEXT_OFF;
          }
        }}
      >
        <item.icon className="w-[15px] h-[15px] shrink-0" />
        {!isCollapsed && (
          <>
            <span className="leading-none flex-1">{item.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className="text-[11px] tabular-nums rounded-md px-1.5 py-0.5 leading-none font-bold"
                style={{
                  background: active ? "rgba(93,95,239,0.18)" : COUNT_BG,
                  color:      active ? "#a5b4fc"              : COUNT_TEXT,
                }}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </>
        )}
        {isCollapsed && (
          <span
            className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-50"
            style={{ background: "#111118", border: `1px solid ${BORDER}`, color: TEXT_ON }}
          >
            {item.label}{count !== undefined && count > 0 ? ` (${count})` : ""}
          </span>
        )}
      </Link>
    );
  };

  // ── collapsible section (mirrors arceclaw section rendering exactly) ───────
  const renderSection = (item: SectionItem) => {
    const isOpen = openSections.includes(item.id);
    const anyChildActive = item.children.some(c => pathname?.startsWith(c.href));

    return (
      <div key={item.id} className="mb-[1px]">
        {/* section header */}
        <button
          type="button"
          onClick={() => {
            if (isCollapsed) {
              // collapsed → click navigates to first child
              router.push(item.children[0]?.href ?? "/");
              return;
            }
            toggleSection(item.id);
          }}
          className={cn(
            "group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors select-none",
            isCollapsed && "justify-center px-0 w-10 mx-auto"
          )}
          style={{
            background: anyChildActive ? ACTIVE_BG : "transparent",
            color:      anyChildActive ? TEXT_ON   : TEXT_OFF,
          }}
          onMouseEnter={e => {
            if (!anyChildActive) {
              (e.currentTarget as HTMLElement).style.background = HOVER_BG;
              (e.currentTarget as HTMLElement).style.color = TEXT_ON;
            }
          }}
          onMouseLeave={e => {
            if (!anyChildActive) {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = TEXT_OFF;
            }
          }}
        >
          <item.icon className="w-[15px] h-[15px] shrink-0" />
          {!isCollapsed && (
            <>
              <span className="leading-none flex-1 text-left font-semibold">{item.label}</span>
              {isOpen
                ? <Minus      className="w-3.5 h-3.5 shrink-0 opacity-40" />
                : <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-40" />
              }
            </>
          )}
          {isCollapsed && (
            <span
              className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{ background: "#111118", border: `1px solid ${BORDER}`, color: TEXT_ON }}
            >
              {item.label}
            </span>
          )}
        </button>

        {/* section children */}
        {!isCollapsed && (
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-0.5 pb-1 space-y-[1px]">
                  {item.children.map(child => {
                    const active = pathname?.startsWith(child.href);
                    return (
                      <Link
                        key={child.id}
                        href={child.href}
                        className="group relative flex items-center pl-9 pr-3 py-[7px] rounded-lg text-[13px] font-medium transition-colors select-none"
                        style={{ background: active ? ACTIVE_BG : "transparent", color: active ? TEXT_ON : TEXT_OFF }}
                        onMouseEnter={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = HOVER_BG;
                            (e.currentTarget as HTMLElement).style.color = TEXT_ON;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                            (e.currentTarget as HTMLElement).style.color = TEXT_OFF;
                          }
                        }}
                      >
                        <span className="leading-none">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  // ── divider ───────────────────────────────────────────────────────────────
  const renderDivider = (item: DividerItem) => (
    <div key={item.id} className="my-1.5 mx-2" style={{ height: 1, background: DIVIDER }} />
  );

  const publicRoutes = ["/auth/login", "/auth/signup"];
  if (publicRoutes.includes(pathname ?? "")) return null;

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-40 hidden xl:flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: isCollapsed ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX,
        background: SB_BG,
        borderRight: `1px solid ${BORDER}`,
      }}
    >
      {/* ── Brand ── */}
      <div
        className={cn("flex items-center h-14 px-4 shrink-0", isCollapsed && "justify-center px-0")}
        style={{ borderBottom: `1px solid ${DIVIDER}` }}
      >
        {isCollapsed ? (
          <span className="text-[15px] font-bold font-galindo leading-none" style={{ color: PURPLE }}>A</span>
        ) : (
          <span className="text-[16px] font-bold font-galindo leading-none tracking-tight" style={{ color: TEXT_ON }}>
            Arcinema<span style={{ color: PURPLE }}>.</span>
          </span>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2.5 space-y-[1px]">
        {NAV.map(entry => {
          if (entry.kind === "flat")    return renderFlat(entry);
          if (entry.kind === "section") return renderSection(entry);
          if (entry.kind === "divider") return renderDivider(entry);
        })}
      </nav>

      {/* ── Bottom ── */}
      <div
        className="shrink-0 px-2 pt-2 pb-1"
        style={{ borderTop: `1px solid ${DIVIDER}` }}
      >
        <div className="space-y-[1px]">
          {BOTTOM.map(renderFlat)}
        </div>

        {/* User card */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-2 transition-colors outline-none",
                isCollapsed && "justify-center px-0"
              )}
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DIVIDER}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
            >
              <div className="relative shrink-0">
                <Avatar className="w-8 h-8 rounded-xl">
                  <AvatarImage src={getAvatarPath(avatarId)} alt={displayName} className="rounded-xl" />
                  <AvatarFallback
                    className="rounded-xl text-[13px] font-bold"
                    style={{ background: PURPLE, color: "#fff" }}
                  >
                    {displayName[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[2px]"
                  style={{ background: "#4ade80", borderColor: SB_BG }}
                />
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-semibold truncate leading-none" style={{ color: TEXT_ON }}>
                      {displayName}
                    </p>
                    <p className="text-[10px] truncate mt-[3px]" style={{ color: "rgba(255,255,255,0.32)" }}>
                      {user?.email ?? "Signed in"}
                    </p>
                  </div>
                  <ChevronsUpDown className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top" align="start" sideOffset={8} className="w-56"
            style={{ background: "#111118", border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
          >
            <DropdownMenuLabel className="pb-2">
              <p className="text-[13px] font-semibold text-white">{displayName}</p>
              <p className="text-[11px] font-normal mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ background: BORDER }} />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 cursor-pointer text-[13px]" style={{ color: TEXT_OFF }} onClick={() => router.push("/user/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer text-[13px]" style={{ color: TEXT_OFF }} onClick={() => router.push("/user/settings")}>
                <Settings className="w-3.5 h-3.5" /> Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator style={{ background: BORDER }} />
            <DropdownMenuItem className="gap-2 cursor-pointer text-[13px]" style={{ color: "#f87171" }} onClick={() => logoutUser()}>
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Collapse button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "w-full flex items-center h-8 px-2 rounded-lg text-[11px] mt-1 transition-colors",
            isCollapsed ? "justify-center" : "justify-end gap-1"
          )}
          style={{ color: "rgba(255,255,255,0.18)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = HOVER_BG;
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.18)";
          }}
        >
          {isCollapsed
            ? <ChevronRight className="w-3.5 h-3.5" />
            : <><span>Collapse</span><ChevronLeft className="w-3.5 h-3.5" /></>
          }
        </button>
      </div>
    </aside>
  );
}
