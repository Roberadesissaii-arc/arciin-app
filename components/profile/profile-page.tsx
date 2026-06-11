"use client"

import { useEffect, useRef, useState } from "react"
import {
  Bell,
  Clock3,
  Database,
  Eraser,
  FingerprintPattern,
  Globe,
  HardDrive,
  Key,
  Usb,
  KeyRound,
  Loader2,
  PackagePlus,
  Server,
  Settings,
  Shield,
  Sparkles,
  User,
  Users,
} from "lucide-react"

import { SignOutButton } from "@/components/auth/sign-out-button"
import { isStandaloneApp } from "@/lib/standalone/config"
import { AccessControlInlinePanel } from "@/components/profile/access-control-inline-panel"
import { AiSettingsInlinePanel } from "@/components/profile/ai-settings-inline-panel"
import { ApiKeysInlinePanel } from "@/components/profile/api-keys-inline-panel"
import { ApiProtectionInlinePanel } from "@/components/profile/api-protection-inline-panel"
import { ChangePasswordPanel } from "@/components/profile/change-password-panel"
import { ChangeServerInlinePanel } from "@/components/profile/change-server-inline-panel"
import { ClearDataInlinePanel } from "@/components/profile/clear-data-inline-panel"
import { DatabaseInlinePanel } from "@/components/profile/database-inline-panel"
import { IntegrationsInlinePanel } from "@/components/profile/integrations-inline-panel"
import { NotificationsInlinePanel } from "@/components/profile/notifications-inline-panel"
import { PreferencesInlinePanel } from "@/components/profile/preferences-inline-panel"
import { RemoteAccessInlinePanel } from "@/components/profile/remote-access-inline-panel"
import { SessionsInlinePanel } from "@/components/profile/sessions-inline-panel"
import { SessionSecurityInlinePanel } from "@/components/profile/session-security-inline-panel"
import { ProfileInlinePanel } from "@/components/profile/profile-inline-panel"
import { AttachDiskInlinePanel } from "@/components/profile/attach-disk-inline-panel"
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
import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import {
  isServerConnected,
  profileDisplayEmail,
  profileDisplayName,
  profileSectionSubtitle,
} from "@/lib/connection/offline-ui"
import { listLibraries } from "@/lib/api/libraries"

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
      {label}
    </p>
  )
}

function MenuCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
      {children}
    </div>
  )
}

export function ProfilePage() {
  const { connection, ready, updateUser, serverReachable } = useConnection()
  const PROFILE_STATS_STALE_MS = 90_000
  const profileStatsCache = useRef(
    new Map<string, { fileCount: number; libraryCount: number; fetchedAt: number }>(),
  )

  const [fileCount, setFileCount] = useState<number | null>(null)
  const [libraryCount, setLibraryCount] = useState<number | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const sessionKey = connection?.sessionToken ?? null
  const toggleSection = (key: string) =>
    setExpanded((prev) => {
      if (prev[key]) return { ...prev, [key]: false }
      return { [key]: true }
    })
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
    if (serverReachable === false) setError(null)
  }, [serverReachable])

  useEffect(() => {
    if (!ready || !sessionKey || !connection || !isServerConnected(serverReachable)) {
      setLoadingStats(false)
      return
    }

    const cache = profileStatsCache.current.get(sessionKey)
    const fresh = cache && Date.now() - cache.fetchedAt <= PROFILE_STATS_STALE_MS

    if (cache) {
      setLibraryCount(cache.libraryCount)
      setFileCount(cache.fileCount)
      setLoadingStats(false)
    }

    if (fresh) return

    let cancelled = false
    const ac = new AbortController()

    void (async () => {
      if (!cache) {
        setLoadingStats(true)
      }
      setError(null)
      try {
        const libraries = await listLibraries(connection, ac.signal)
        if (cancelled) return
        const libs = libraries.length
        const files = libraries.reduce((sum, lib) => sum + (lib.assetCount ?? 0), 0)
        setLibraryCount(libs)
        setFileCount(files)
        profileStatsCache.current.set(sessionKey, {
          libraryCount: libs,
          fileCount: files,
          fetchedAt: Date.now(),
        })
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
  }, [ready, sessionKey, connection, serverReachable])

  const user = connection?.user
  const serverConnected = isServerConnected(serverReachable)
  const displayName = profileDisplayName(user, serverReachable)
  const displayEmail = profileDisplayEmail(user, serverReachable)
  const roleLabel = serverConnected ? (user?.role ?? "Member") : "—"
  const avatarCacheKey = `${user?.id ?? ""}-${user?.avatarUrl ?? ""}-${user?.updatedAt ?? ""}`

  return (
    <div
      className="-mx-4 -mt-4 flex flex-col gap-5 px-4 pb-2"
      style={{ paddingTop: "max(0.25rem, env(safe-area-inset-top, 0px))" }}
    >
      <ArciinDarkGradientPanel className="p-6">
        <div className="flex flex-col items-center gap-4">
          {connection && serverConnected ? (
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
              className="flex size-16 items-center justify-center rounded-2xl bg-zinc-800 ring-2 ring-white/15"
              aria-hidden
            >
              <User className="size-8 text-zinc-500" strokeWidth={1.5} />
            </div>
          )}
          <div className="text-center">
            <p
              className="text-[20px] font-bold text-white"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", letterSpacing: "-0.3px" }}
            >
              {displayName}
            </p>
            {displayEmail ? (
              <p className="mt-1 text-[12px] text-zinc-400">{displayEmail}</p>
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
                {!serverConnected ? (
                  "—"
                ) : loadingStats ? (
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
                {!serverConnected ? (
                  "—"
                ) : loadingStats ? (
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

      <PageFetchErrorAlert error={error} className="text-center" />

      <div>
        <SectionLabel label="Profile" />
        <SettingsGroup>
          <SettingsGroupItem
            icon={User}
            label="Profile"
            sub={profileSectionSubtitle(
              serverReachable,
              user?.email ?? "Name, email & photo",
            )}
            open={profileOpen}
            onToggle={() => setProfileOpen((o) => !o)}
          >
            <ProfileInlinePanel enabled={profileOpen} />
          </SettingsGroupItem>
        </SettingsGroup>
      </div>

      <div>
        <SectionLabel label="Account" />
        <SettingsGroup>
          {!isStandaloneApp() ? (
            <>
              <SettingsGroupItem
                icon={Server}
                label="Change server"
                sub="Switch, check status, or remove saved servers"
                open={sectionOpen("change-server")}
                onToggle={() => toggleSection("change-server")}
              >
                <ChangeServerInlinePanel enabled={sectionOpen("change-server")} />
              </SettingsGroupItem>
              <SettingsGroupDivider />
            </>
          ) : null}
          <SettingsGroupItem
            icon={Bell}
            label="Notifications"
            sub={profileSectionSubtitle(
              serverReachable,
              "Activity feed & alert preferences",
              "Available when connected",
            )}
            open={sectionOpen("notifications")}
            onToggle={() => toggleSection("notifications")}
            footerHref="/notifications"
            footerLabel="Open notifications feed"
          >
            <NotificationsInlinePanel enabled={sectionOpen("notifications")} />
          </SettingsGroupItem>
        </SettingsGroup>
      </div>

      <div>
        <SectionLabel label="Instance" />
        <SettingsGroup>
          <SettingsGroupItem
            icon={HardDrive}
            label="Storage"
            sub="Usage & root path"
            open={sectionOpen("storage")}
            onToggle={() => toggleSection("storage")}
          >
            <StorageInlinePanel enabled={sectionOpen("storage")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={Usb}
            label="Attach disk"
            sub="SSD, USB & transfer"
            open={sectionOpen("attach-disk")}
            onToggle={() => toggleSection("attach-disk")}
          >
            <AttachDiskInlinePanel enabled={sectionOpen("attach-disk")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={Globe}
            label="Remote access"
            sub="Domain, LAN & tunnel"
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
            <ChangePasswordPanel enabled={sectionOpen("password")} />
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
            icon={Clock3}
            label="Idle auto-logout"
            sub="Sign out after inactivity"
            open={sectionOpen("session-security")}
            onToggle={() => toggleSection("session-security")}
          >
            <SessionSecurityInlinePanel enabled={sectionOpen("session-security")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={Shield}
            label="API protection"
            sub="Rate limits & IP rules"
            open={sectionOpen("api-protection")}
            onToggle={() => toggleSection("api-protection")}
          >
            <ApiProtectionInlinePanel enabled={sectionOpen("api-protection")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={Eraser}
            label="Data reset"
            sub="Clear media, chat & app data"
            open={sectionOpen("data-reset")}
            onToggle={() => toggleSection("data-reset")}
          >
            <ClearDataInlinePanel enabled={sectionOpen("data-reset")} />
          </SettingsGroupItem>
          <SettingsGroupDivider />
          <SettingsGroupItem
            icon={Sparkles}
            label="AI settings"
            sub="Planning & security"
            open={sectionOpen("ai-settings")}
            onToggle={() => toggleSection("ai-settings")}
          >
            <AiSettingsInlinePanel enabled={sectionOpen("ai-settings")} />
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
            sub="Signup, session lifetime & lockout"
            open={sectionOpen("access-control")}
            onToggle={() => toggleSection("access-control")}
          >
            <AccessControlInlinePanel enabled={sectionOpen("access-control")} />
          </SettingsGroupItem>
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
