"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FingerprintPattern,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import {
  PasswordVaultAddEntrySheet,
  PasswordVaultChooserSheet,
  PasswordVaultImportSheet,
} from "@/components/profile/password-vault-action-sheets"
import { PasswordVaultIntroCard } from "@/components/profile/password-vault-intro-card"
import { PasswordVaultEntryListSkeleton } from "@/components/profile/password-vault-entry-skeleton"
import {
  PasswordVaultIntroSkeleton,
  PasswordVaultSearchRowSkeleton,
} from "@/components/profile/password-vault-intro-skeleton"
import { VaultBrandMark } from "@/components/profile/vault-brand-mark"
import {
  MobilePageIntro,
  MobilePageIntroStatusPill,
  MobilePageStickyHeader,
} from "@/components/shell/mobile-page-intro"
import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { PlanGateCard } from "@/components/shell/plan-gate-card"
import { formatApiError, isLicenseRequiredError, licenseRequiredPlan } from "@/lib/api/errors"
import { copyTextWithFallback } from "@/lib/utils/clipboard"
import type { MobileConnection } from "@/lib/types/api"
import {
  getPasswordVault,
  lockPasswordVault,
  revealPasswordVaultEntry,
  unlockPasswordVault,
  type PasswordVaultEntry,
  type PasswordVaultList,
  type VaultUnlockInput,
} from "@/lib/api/password-vault"
import { resolveVaultBrand } from "@/lib/password-vault/vault-brand"
import { resolveDesktopWebBaseForAssets } from "@/lib/password-vault/desktop-web-base"

function entryHasPassword(entry: PasswordVaultEntry) {
  return Boolean(entry.hasPassword ?? entry.passwordLength ?? entry.password)
}

function entryMatchesQuery(entry: PasswordVaultEntry, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [entry.name, entry.username, entry.url, entry.notes, entry.category]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
}

function maskPassword(entry: PasswordVaultEntry, style: "dots" | "asterisk" | "block" = "dots") {
  const len = entry.password?.length ?? entry.passwordLength ?? 10
  const n = Math.min(Math.max(len, 8), 16)
  if (style === "asterisk") return "*".repeat(n)
  if (style === "block") return "█".repeat(n)
  return "•".repeat(n)
}

function UnlockSheet({
  pinConfigured,
  title,
  description,
  onClose,
  onUnlock,
}: {
  pinConfigured: boolean
  title: string
  description: string
  onClose: () => void
  onUnlock: (input: VaultUnlockInput) => Promise<void>
}) {
  const [value, setValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!value.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onUnlock(pinConfigured ? { pin: value } : { password: value })
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <MobileBottomSheet open onClose={onClose} title={title} description={description}>
      {error ? <p className="mb-3 text-[12px] text-[#b91c1c]">{error}</p> : null}
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={pinConfigured ? "Vault PIN" : "Account password"}
        className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[16px] outline-none focus:border-[var(--arciin-accent,#ff4f12)]"
        autoComplete={pinConfigured ? "off" : "current-password"}
      />
      <button
        type="button"
        disabled={saving || !value.trim()}
        onClick={() => void submit()}
        className="btn-accent-solid mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Continue
      </button>
    </MobileBottomSheet>
  )
}

function entryPlainPassword(
  entry: PasswordVaultEntry,
  ephemeral: Record<string, string>,
): string | null {
  if (ephemeral[entry.id]) return ephemeral[entry.id]!
  return entry.password ?? null
}

function EntryRow({
  entry,
  webBase,
  connection,
  maskStyle,
  secretsVisible,
  ephemeralPasswords,
  revealed,
  onEyeClick,
  onCopy,
}: {
  entry: PasswordVaultEntry
  webBase?: string | null
  connection?: MobileConnection | null
  maskStyle: "dots" | "asterisk" | "block"
  secretsVisible: boolean
  ephemeralPasswords: Record<string, string>
  revealed: boolean
  onEyeClick: () => void
  onCopy: (text: string, label: string) => void
}) {
  const hasPassword = entryHasPassword(entry)
  const plain = entryPlainPassword(entry, ephemeralPasswords)
  const visible = Boolean(plain && revealed)
  const displayPassword = visible && plain ? plain : maskPassword(entry, maskStyle)
  const brand = resolveVaultBrand(entry)

  return (
    <li
      className="rounded-2xl bg-white p-4"
      style={{ border: "1px solid #e5e5e5", boxShadow: "0 1px 0 rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-start gap-3">
        <VaultBrandMark entry={entry} webBase={webBase} connection={connection} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#222222]">{entry.name}</p>
              {brand ? (
                <p className="mt-0.5 text-[11px] font-medium text-[#a0a0a0]">{brand.label}</p>
              ) : null}
              {entry.username ? (
                <p className="mt-0.5 truncate text-[12px] text-[#717171]">{entry.username}</p>
              ) : null}
            </div>
            {entry.url ? (
              <a
                href={entry.url.startsWith("http") ? entry.url : `https://${entry.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f7f7f7] text-[#717171]"
                style={{ border: "1px solid #e8e8e8" }}
                aria-label="Open URL"
              >
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {hasPassword ? (
        <div
          className="mt-3 flex items-center gap-2 rounded-xl bg-[#f7f7f7] px-3 py-2"
          style={{ border: "1px solid #ececec" }}
        >
          <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-[#222222]">
            {displayPassword}
          </span>
          <button
            type="button"
            onClick={onEyeClick}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#717171] active:bg-white"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          {visible && plain ? (
            <button
              type="button"
              onClick={() => onCopy(plain, "Password")}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#717171] active:bg-white"
              aria-label="Copy password"
            >
              <Copy className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {entry.username && secretsVisible ? (
        <button
          type="button"
          onClick={() => onCopy(entry.username!, "Username")}
          className="text-accent mt-2 flex items-center gap-1.5 text-[12px] font-medium"
        >
          <Copy className="size-3.5" />
          Copy username
        </button>
      ) : null}
    </li>
  )
}

// Memory-only, short-lived — never persisted to disk. Avoids re-showing a full
// skeleton on every revisit while still re-validating quickly against the
// server's own 15-minute unlock window (see getPasswordVault / lockRequired).
const VAULT_STALE_MS = 15_000
const vaultCache = new Map<string, { vault: PasswordVaultList; fetchedAt: number }>()

export function PasswordsPage() {
  const { connection, ready } = useConnection()
  const sessionKey = connection?.sessionToken ?? null
  const cachedVault = sessionKey ? vaultCache.get(sessionKey) : undefined

  const [vault, setVault] = useState<PasswordVaultList | null>(() => cachedVault?.vault ?? null)
  const [loading, setLoading] = useState(() => !cachedVault)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planGate, setPlanGate] = useState<string | null>(null)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [pendingVaultUnlock, setPendingVaultUnlock] = useState(false)
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [ephemeralPasswords, setEphemeralPasswords] = useState<Record<string, string>>({})
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [chooserOpen, setChooserOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(
    async (signal?: AbortSignal, isRefresh = false, background = false) => {
      if (!connection) return
      if (isRefresh) setRefreshing(true)
      else if (!background) setLoading(true)
      setError(null)
      setPlanGate(null)
      try {
        const data = await getPasswordVault(connection, signal)
        if (!signal?.aborted) {
          setVault(data)
          if (data.lockRequired && !data.secretsVisible) {
            setRevealed({})
          }
          if (connection.sessionToken) {
            vaultCache.set(connection.sessionToken, { vault: data, fetchedAt: Date.now() })
          }
        }
      } catch (err) {
        if (!signal?.aborted) {
          if (isLicenseRequiredError(err)) {
            // Plan gate, not a permissions problem — show the upgrade card, not an error.
            setPlanGate(licenseRequiredPlan(err) ?? "pro")
          } else {
            setError(formatApiError(err, connection.webUrl ?? connection.apiBaseUrl))
          }
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [connection],
  )

  useEffect(() => {
    if (!ready || !connection) return
    const fresh = cachedVault != null && Date.now() - cachedVault.fetchedAt <= VAULT_STALE_MS
    if (fresh) return
    const controller = new AbortController()
    void load(controller.signal, false, cachedVault != null)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cachedVault is a read of a module map, not reactive state
  }, [ready, connection, load])

  const secretsVisible = vault?.secretsVisible ?? false
  const lockRequired = vault?.lockRequired ?? false
  const pinConfigured = vault?.pinConfigured ?? false
  const statsLoading = loading && !vault
  const entries = vault?.entries ?? []
  const filteredEntries = entries.filter((entry) => entryMatchesQuery(entry, searchQuery))
  const maskStyle = vault?.display?.maskStyle ?? "dots"
  const assetWebBase = connection
    ? resolveDesktopWebBaseForAssets(connection)
    : null

  function openVaultUnlock() {
    setPendingVaultUnlock(true)
    setPendingRevealId(null)
    setUnlockOpen(true)
  }

  function openRevealForEntry(entryId: string) {
    setPendingVaultUnlock(false)
    setPendingRevealId(entryId)
    setUnlockOpen(true)
  }

  function revealOnlyEntry(entryId: string) {
    setRevealed({ [entryId]: true })
    setEphemeralPasswords((prev) => {
      const next: Record<string, string> = {}
      if (prev[entryId]) next[entryId] = prev[entryId]!
      return next
    })
  }

  function onEyeClick(entry: PasswordVaultEntry) {
    if (!entryHasPassword(entry)) return

    const plain = entryPlainPassword(entry, ephemeralPasswords)
    const visible = Boolean(plain && revealed[entry.id])
    if (visible) {
      setRevealed((prev) => ({ ...prev, [entry.id]: false }))
      setEphemeralPasswords((prev) => {
        const next = { ...prev }
        delete next[entry.id]
        return next
      })
      return
    }

    if (secretsVisible) {
      revealOnlyEntry(entry.id)
      return
    }

    openRevealForEntry(entry.id)
  }

  async function handleUnlock(input: VaultUnlockInput) {
    if (!connection) return

    const revealAfter = pendingRevealId

    if (pendingVaultUnlock) {
      await unlockPasswordVault(connection, input)
      setEphemeralPasswords({})
      setRevealed({})
    } else if (revealAfter) {
      const entry = await revealPasswordVaultEntry(connection, revealAfter, input)
      if (entry.password) {
        setEphemeralPasswords((prev) => ({ ...prev, [revealAfter]: entry.password! }))
        revealOnlyEntry(revealAfter)
      }
    }

    await load(undefined, true)
    const fresh = await getPasswordVault(connection)
    setVault(fresh)

    setPendingVaultUnlock(false)
    setPendingRevealId(null)
  }

  async function handleLock() {
    if (!connection) return
    await lockPasswordVault(connection)
    setRevealed({})
    setEphemeralPasswords({})
    await load(undefined, true)
  }

  async function copyText(text: string, label: string) {
    const ok = await copyTextWithFallback(text)
    setCopyMsg(ok ? `${label} copied` : "Could not copy")
    setTimeout(() => setCopyMsg(null), 2000)
  }

  const unlockTitle = pendingVaultUnlock
    ? "Unlock vault"
    : pendingRevealId
      ? "View this password"
      : "Unlock vault"
  const unlockDescription = pendingVaultUnlock
    ? pinConfigured
      ? "Unlock once to use the eye on any entry without entering your PIN again."
      : "Unlock once to use the eye on any entry without entering your password again."
    : pinConfigured
      ? "View this password only. The vault stays locked for other entries."
      : "View this password only. The vault stays locked for other entries."

  if (planGate) {
    return (
      <div className="flex flex-col gap-4">
        <MobilePageStickyHeader>
          <MobilePageIntro
            title="Passwords"
            subtitle="Encrypted vault · instance credentials on your server."
            description="Saved credentials stay encrypted on your server's disk. The vault unlocks with a paid Arciin plan."
            cornerIcon={FingerprintPattern}
            footer={
              <MobilePageIntroStatusPill icon={Lock}>Locked</MobilePageIntroStatusPill>
            }
          />
        </MobilePageStickyHeader>
        <PlanGateCard featureLabel="Password vault" plan={planGate} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {copyMsg ? (
        <p className="rounded-xl bg-[#f0fdf4] px-3 py-2 text-center text-[12px] font-medium text-[#15803d]">
          {copyMsg}
        </p>
      ) : null}

      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </div>
      ) : null}

      <MobilePageStickyHeader>
        {statsLoading ? (
          <>
            <PasswordVaultIntroSkeleton />
            <div className="mt-1.5">
              <PasswordVaultSearchRowSkeleton />
            </div>
          </>
        ) : (
          <>
            <PasswordVaultIntroCard
              entryCount={vault?.total ?? 0}
              loading={loading}
              lockRequired={lockRequired}
              secretsVisible={secretsVisible}
              pinConfigured={pinConfigured}
              onUnlock={openVaultUnlock}
              onLock={() => void handleLock()}
            />
            <div className="mt-1.5 flex items-center gap-2">
              <div
                className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5"
                style={{ border: "1px solid #e5e5e5" }}
              >
                <Search className="size-4 shrink-0 text-[#c0c0c0]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search passwords…"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#222222] outline-none placeholder:text-[#c0c0c0]"
                  autoComplete="off"
                  aria-label="Search saved passwords"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="shrink-0 text-[#c0c0c0] active:text-[#717171]"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void load(undefined, true)}
                disabled={loading}
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#717171] disabled:opacity-50 active:bg-[#f7f7f7]"
                style={{ border: "1px solid #e5e5e5" }}
                aria-label="Refresh"
              >
                <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setChooserOpen(true)}
                disabled={!connection}
                className="btn-accent-solid flex size-10 shrink-0 items-center justify-center rounded-2xl active:opacity-80 disabled:opacity-50"
                aria-label="Add password"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </>
        )}
      </MobilePageStickyHeader>

      {statsLoading ? (
        <PasswordVaultEntryListSkeleton count={3} />
      ) : entries.length === 0 ? (
        <div
          className="rounded-2xl bg-white px-4 py-14 text-center"
          style={{ border: "1px dashed #e5e5e5" }}
        >
          <FingerprintPattern className="mx-auto mb-3 size-8 text-[#e5e5e5]" />
          <p className="text-[13px] font-medium text-[#222222]">No passwords saved</p>
          <p className="mt-1 text-[12px] text-[#a0a0a0]">
            Tap + to add a password or import from a file — right here on your phone.
          </p>
          <button
            type="button"
            onClick={() => setChooserOpen(true)}
            disabled={!connection}
            className="btn-accent-solid mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50"
          >
            <Plus className="size-4" />
            Add password
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div
          className="rounded-2xl bg-white px-4 py-10 text-center"
          style={{ border: "1px dashed #e5e5e5" }}
        >
          <p className="text-[13px] font-medium text-[#222222]">No matches</p>
          <p className="mt-1 text-[12px] text-[#a0a0a0]">
            Nothing matched &ldquo;{searchQuery.trim()}&rdquo;. Try another keyword.
          </p>
        </div>
      ) : (
        <ul className={`flex flex-col gap-3 ${refreshing ? "opacity-60" : ""}`}>
          {filteredEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              webBase={assetWebBase}
              connection={connection}
              maskStyle={maskStyle}
              secretsVisible={secretsVisible}
              ephemeralPasswords={ephemeralPasswords}
              revealed={Boolean(revealed[entry.id])}
              onEyeClick={() => onEyeClick(entry)}
              onCopy={copyText}
            />
          ))}
        </ul>
      )}

      {unlockOpen ? (
        <UnlockSheet
          pinConfigured={pinConfigured}
          title={unlockTitle}
          description={unlockDescription}
          onClose={() => {
            setUnlockOpen(false)
            setPendingVaultUnlock(false)
            setPendingRevealId(null)
          }}
          onUnlock={handleUnlock}
        />
      ) : null}

      {connection ? (
        <>
          <PasswordVaultChooserSheet
            open={chooserOpen}
            onClose={() => setChooserOpen(false)}
            onAddManual={() => setAddOpen(true)}
            onImport={() => setImportOpen(true)}
          />
          <PasswordVaultAddEntrySheet
            open={addOpen}
            onClose={() => setAddOpen(false)}
            connection={connection}
            onSaved={(message) => {
              setCopyMsg(message)
              setTimeout(() => setCopyMsg(null), 2500)
              void load(undefined, true)
            }}
          />
          <PasswordVaultImportSheet
            open={importOpen}
            onClose={() => setImportOpen(false)}
            connection={connection}
            onSaved={(message) => {
              setCopyMsg(message)
              setTimeout(() => setCopyMsg(null), 2500)
              void load(undefined, true)
            }}
          />
        </>
      ) : null}
    </div>
  )
}
