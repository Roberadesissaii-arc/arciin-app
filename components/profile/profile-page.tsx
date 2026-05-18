"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Bell,
  ChevronRight,
  FingerprintPattern,
  Globe,
  HardDrive,
  Key,
  Loader2,
  PackagePlus,
  Settings,
  Shield,
  Sparkles,
  User,
  Users,
} from "lucide-react"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { UserAvatarImage } from "@/components/profile/user-avatar-image"
import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { listLibraries } from "@/lib/api/libraries"

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
      {label}
    </p>
  )
}

function MenuRow({
  icon: Icon,
  label,
  sub,
  destructive,
  href,
  soon,
}: {
  icon: React.ElementType
  label: string
  sub?: string
  destructive?: boolean
  href?: string
  soon?: boolean
}) {
  const inner = (
    <>
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: destructive ? "rgba(220,38,38,0.06)" : "#f7f7f7",
          border: "1px solid #e5e5e5",
        }}
      >
        <Icon className="size-[15px]" style={{ color: destructive ? "#dc2626" : "#717171" }} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[14px] font-medium" style={{ color: destructive ? "#dc2626" : "#222222" }}>
          {label}
        </p>
        {sub && <p className="text-[11px] text-[#a0a0a0]">{sub}</p>}
      </div>
      {soon ? (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#a0a0a0]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          Soon
        </span>
      ) : (
        <ChevronRight className="size-4 shrink-0 text-[#c0c0c0]" />
      )}
    </>
  )

  if (href && !soon) {
    return (
      <Link href={href} className="flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-[#f7f7f7]">
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" className="flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-[#f7f7f7]">
      {inner}
    </button>
  )
}

function Divider() {
  return <div className="mx-4 h-px bg-[#f0f0f0]" />
}

function MenuCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
      {children}
    </div>
  )
}

export function ProfilePage() {
  const { connection, ready } = useConnection()
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [libraryCount, setLibraryCount] = useState<number | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionKey = connection?.sessionToken ?? null

  useEffect(() => {
    if (!ready || !sessionKey || !connection) return
    let cancelled = false
    const ac = new AbortController()

    void (async () => {
      setLoadingStats(true)
      setError(null)
      try {
        const libraries = await listLibraries(connection, ac.signal)
        if (cancelled) return
        setLibraryCount(libraries.length)
        setFileCount(libraries.reduce((sum, lib) => sum + (lib.assetCount ?? 0), 0))
      } catch (err) {
        if (!cancelled) setError(formatApiError(err))
      } finally {
        if (!cancelled) setLoadingStats(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- connection read inside; sessionKey avoids reload loops
  }, [ready, sessionKey])

  const user = connection?.user
  const roleLabel = user?.role ?? "Member"

  return (
    <div className="flex flex-col gap-5">
      <div
        className="overflow-hidden rounded-3xl p-6"
        style={{ background: "linear-gradient(135deg, #ff4f12 0%, #cc2e00 100%)" }}
      >
        <div className="flex flex-col items-center gap-4">
          {connection ? (
            <UserAvatarImage
              connection={connection}
              avatarUrl={user?.avatarUrl}
              updatedAt={user?.updatedAt}
              name={user?.name}
              size={72}
              fallbackClassName="bg-white/20"
              className="ring-2 ring-white/30"
            />
          ) : (
            <div
              className="flex size-[72px] items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30"
              aria-hidden
            />
          )}
          <div className="text-center">
            <p
              className="text-[20px] font-bold text-white"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", letterSpacing: "-0.3px" }}
            >
              {user?.name?.trim() || "—"}
            </p>
            {user?.email ? (
              <p className="mt-1 text-[12px] text-white/80">{user.email}</p>
            ) : null}
            <div
              className="mt-2 inline-block rounded-xl px-3 py-1"
              style={{ backgroundColor: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-white">{roleLabel}</p>
            </div>
          </div>
          <div
            className="flex w-full items-center justify-center pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}
          >
            <div className="flex flex-1 flex-col items-center gap-1">
              <p className="text-[24px] font-black text-white tabular-nums">
                {loadingStats ? (
                  <Loader2 className="mx-auto size-6 animate-spin opacity-80" />
                ) : (
                  (fileCount ?? "—")
                )}
              </p>
              <p className="text-[12px] font-semibold text-white/80">Files</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="flex flex-1 flex-col items-center gap-1">
              <p className="text-[24px] font-black text-white tabular-nums">
                {loadingStats ? (
                  <Loader2 className="mx-auto size-6 animate-spin opacity-80" />
                ) : (
                  (libraryCount ?? "—")
                )}
              </p>
              <p className="text-[12px] font-semibold text-white/80">Libraries</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p
          className="rounded-xl px-4 py-3 text-center text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </p>
      ) : null}

      <div>
        <SectionLabel label="Account" />
        <MenuCard>
          <MenuRow icon={User} label="Edit profile" sub="Name, email, avatar" href="/profile/edit" />
          <Divider />
          <MenuRow icon={Bell} label="Notifications" sub="Alerts & toasts" href="/profile/notifications" />
        </MenuCard>
      </div>

      <div>
        <SectionLabel label="Instance" />
        <MenuCard>
          <MenuRow icon={HardDrive} label="Storage" sub="Root path & usage" href="/profile/storage" />
          <Divider />
          <MenuRow icon={Globe} label="Remote access" sub="Domain & tunnel" href="/profile/remote-access" />
        </MenuCard>
      </div>

      <div>
        <SectionLabel label="Security" />
        <MenuCard>
          <MenuRow icon={Shield} label="Security" sub="Sessions & password" href="/profile/security" />
          <Divider />
          <MenuRow icon={FingerprintPattern} label="Passwords" sub="Vault & saved logins" href="/profile/passwords" />
          <Divider />
          <MenuRow icon={Users} label="Access control" sub="User roles & invites" soon />
          <Divider />
          <MenuRow icon={Key} label="API Keys" sub="Developer access" href="/profile/api-keys" />
        </MenuCard>
      </div>

      <div>
        <SectionLabel label="Intelligence" />
        <MenuCard>
          <MenuRow icon={Sparkles} label="AI planning" sub="Arciin AI settings" soon />
        </MenuCard>
      </div>

      <div>
        <SectionLabel label="Personalization" />
        <MenuCard>
          <MenuRow icon={Settings} label="Preferences" sub="Appearance & behaviour" href="/profile/preferences" />
          <Divider />
          <MenuRow icon={PackagePlus} label="Integrations" sub="Plex, Jellyfin & more" href="/profile/integrations" />
        </MenuCard>
      </div>

      <div>
        <MenuCard>
          <SignOutButton />
        </MenuCard>
      </div>

      <p className="pb-2 text-center text-[11px] text-[#c0c0c0]">
        Arciin · Your server, your control.
      </p>
    </div>
  )
}
