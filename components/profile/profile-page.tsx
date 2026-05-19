"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Bell,
  ChevronRight,
  Database,
  FingerprintPattern,
  Globe,
  HardDrive,
  Key,
  KeyRound,
  Loader2,
  PackagePlus,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { ApiKeysInlinePanel } from "@/components/profile/api-keys-inline-panel"
import { ChangePasswordPanel } from "@/components/profile/change-password-panel"
import { DatabaseInlinePanel } from "@/components/profile/database-inline-panel"
import { IntegrationsInlinePanel } from "@/components/profile/integrations-inline-panel"
import { PreferencesInlinePanel } from "@/components/profile/preferences-inline-panel"
import { RemoteAccessInlinePanel } from "@/components/profile/remote-access-inline-panel"
import { SessionsInlinePanel } from "@/components/profile/sessions-inline-panel"
import { ProfileInlinePanel } from "@/components/profile/profile-inline-panel"
import { StorageInlinePanel } from "@/components/profile/storage-inline-panel"
import { VaultInlinePanel } from "@/components/profile/vault-inline-panel"
import {
  SettingsGroup,
  SettingsGroupDivider,
  SettingsGroupItem,
} from "@/components/settings/settings-group"
import { UserAvatarImage } from "@/components/profile/user-avatar-image"
import { useConnection } from "@/components/providers/connection-provider"
import { ArciinDarkGradientPanel } from "@/components/ui/arciin-dark-gradient-panel"
import { getAuthMe } from "@/lib/api/auth"
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
  const { connection, ready, updateUser } = useConnection()
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [libraryCount, setLibraryCount] = useState<number | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const sessionKey = connection?.sessionToken ?? null
  const toggleSection = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  const sectionOpen = (key: string) => Boolean(expanded[key])

  useEffect(() => {
    if (!ready || !sessionKey || !connection) return
    let cancelled = false
    void (async () => {
      try {
        const me = await getAuthMe(connection)
        if (!cancelled) updateUser(me.user)
      } catch {
        /* keep cached user */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready, sessionKey, connection, updateUser])

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
  const avatarCacheKey = `${user?.id ?? ""}-${user?.avatarUrl ?? ""}-${user?.updatedAt ?? ""}`

  return (
    <div className="flex flex-col gap-5">
      <ArciinDarkGradientPanel className="p-6">
        <div className="flex flex-col items-center gap-4">
          {connection ? (
            <UserAvatarImage
              key={avatarCacheKey}
              connection={connection}
              userId={user?.id}
              avatarUrl={user?.avatarUrl}
              updatedAt={user?.updatedAt}
              name={user?.name}
              size={64}
              tone="dark"
              shape="rounded"
            />
          ) : (
            <div
              className="flex size-16 items-center justify-center rounded-2xl bg-zinc-800 text-lg font-semibold text-[#ff4f12] ring-2 ring-white/15"
              aria-hidden
            >
              ?
            </div>
          )}
          <div className="text-center">
            <p
              className="text-[20px] font-bold text-white"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", letterSpacing: "-0.3px" }}
            >
              {user?.name?.trim() || "—"}
            </p>
            {user?.email ? (
              <p className="mt-1 text-[12px] text-zinc-400">{user.email}</p>
            ) : null}
            <div className="mt-2 inline-block rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-300">
                {roleLabel}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center justify-center border-t border-white/[0.08] pt-4">
            <div className="flex flex-1 flex-col items-center gap-1">
              <p className="text-[24px] font-black text-white tabular-nums">
                {loadingStats ? (
                  <Loader2 className="mx-auto size-6 animate-spin text-zinc-500" />
                ) : (
                  (fileCount ?? "—")
                )}
              </p>
              <p className="text-[12px] font-semibold text-zinc-500">Files</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-1 flex-col items-center gap-1">
              <p className="text-[24px] font-black text-white tabular-nums">
                {loadingStats ? (
                  <Loader2 className="mx-auto size-6 animate-spin text-zinc-500" />
                ) : (
                  (libraryCount ?? "—")
                )}
              </p>
              <p className="text-[12px] font-semibold text-zinc-500">Libraries</p>
            </div>
          </div>
        </div>
      </ArciinDarkGradientPanel>

      {error ? (
        <p
          className="rounded-xl px-4 py-3 text-center text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </p>
      ) : null}

      <div>
        <SectionLabel label="Profile" />
        <SettingsGroup>
          <SettingsGroupItem
            icon={User}
            label="Profile"
            sub={user?.email ?? "Name, email & photo"}
            open={profileOpen}
            onToggle={() => setProfileOpen((o) => !o)}
          >
            <ProfileInlinePanel enabled={profileOpen} />
          </SettingsGroupItem>
        </SettingsGroup>
      </div>

      <div>
        <SectionLabel label="Account" />
        <MenuCard>
          <MenuRow icon={Bell} label="Notifications" sub="Alerts & toasts" href="/profile/notifications" />
        </MenuCard>
      </div>

      <div>
        <SectionLabel label="Instance" />
        <SettingsGroup>
          <SettingsGroupItem
            icon={HardDrive}
            label="Storage"
            sub="Root path & usage"
            open={sectionOpen("storage")}
            onToggle={() => toggleSection("storage")}
          >
            <StorageInlinePanel enabled={sectionOpen("storage")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={Globe}
            label="Remote access"
            sub="Domain & tunnel"
            open={sectionOpen("remote")}
            onToggle={() => toggleSection("remote")}
          >
            <RemoteAccessInlinePanel enabled={sectionOpen("remote")} />
          </SettingsGroupItem>
        </SettingsGroup>
      </div>

      <div>
        <SectionLabel label="Data & security" />
        <SettingsGroup>
          <SettingsGroupItem
            icon={Database}
            label="Database"
            sub="Tables & app data"
            open={sectionOpen("database")}
            onToggle={() => toggleSection("database")}
          >
            <DatabaseInlinePanel enabled={sectionOpen("database")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={KeyRound}
            label="Password"
            sub="Change your sign-in password"
            open={sectionOpen("password")}
            onToggle={() => toggleSection("password")}
          >
            <ChangePasswordPanel />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={Shield}
            label="Sessions"
            sub="Active devices & sign-out"
            open={sectionOpen("sessions")}
            onToggle={() => toggleSection("sessions")}
          >
            <SessionsInlinePanel enabled={sectionOpen("sessions")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={FingerprintPattern}
            label="Password vault"
            sub="Encrypted saved logins"
            open={sectionOpen("vault")}
            onToggle={() => toggleSection("vault")}
          >
            <VaultInlinePanel enabled={sectionOpen("vault")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={Users}
            label="Access control"
            sub="User roles & invites"
            open={false}
            onToggle={() => {}}
            soon
          />
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={Key}
            label="API Keys"
            sub="Developer access"
            open={sectionOpen("api-keys")}
            onToggle={() => toggleSection("api-keys")}
          >
            <ApiKeysInlinePanel enabled={sectionOpen("api-keys")} />
          </SettingsGroupItem>
        </SettingsGroup>
      </div>

      <div>
        <SectionLabel label="Personalization" />
        <SettingsGroup>
          <SettingsGroupItem
            icon={Settings}
            label="Preferences"
            sub="Appearance & behaviour"
            open={sectionOpen("preferences")}
            onToggle={() => toggleSection("preferences")}
          >
            <PreferencesInlinePanel enabled={sectionOpen("preferences")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={PackagePlus}
            label="Integrations"
            sub="Plex, Jellyfin & more"
            open={sectionOpen("integrations")}
            onToggle={() => toggleSection("integrations")}
          >
            <IntegrationsInlinePanel enabled={sectionOpen("integrations")} />
          </SettingsGroupItem>
        </SettingsGroup>
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
