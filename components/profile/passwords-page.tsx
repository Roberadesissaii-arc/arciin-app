"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FingerprintPattern,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { formatApiError } from "@/lib/api/errors"
import {
  getPasswordVault,
  lockPasswordVault,
  unlockPasswordVault,
  verifyPasswordVault,
  type PasswordVaultEntry,
  type PasswordVaultList,
  type VaultUnlockInput,
} from "@/lib/api/password-vault"

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
        className="w-full rounded-xl border border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2.5 text-[14px] outline-none focus:border-[#ff4f12]"
        autoComplete={pinConfigured ? "off" : "current-password"}
      />
      <button
        type="button"
        disabled={saving || !value.trim()}
        onClick={() => void submit()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "#ff4f12" }}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Continue
      </button>
    </MobileBottomSheet>
  )
}

function EntryRow({
  entry,
  maskStyle,
  secretsVisible,
  revealed,
  onEyeClick,
  onCopy,
}: {
  entry: PasswordVaultEntry
  maskStyle: "dots" | "asterisk" | "block"
  secretsVisible: boolean
  revealed: boolean
  onEyeClick: () => void
  onCopy: (text: string, label: string) => void
}) {
  const hasPassword = entryHasPassword(entry)
  const visible = Boolean(secretsVisible && entry.password && revealed)
  const displayPassword = visible && entry.password ? entry.password : maskPassword(entry, maskStyle)

  return (
    <li
      className="rounded-2xl bg-white p-4"
      style={{ border: "1px solid #e5e5e5", boxShadow: "0 1px 0 rgba(0,0,0,0.03)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#222222]">{entry.name}</p>
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
          {visible && entry.password ? (
            <button
              type="button"
              onClick={() => onCopy(entry.password!, "Password")}
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
          className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#ff4f12]"
        >
          <Copy className="size-3.5" />
          Copy username
        </button>
      ) : null}
    </li>
  )
}

export function PasswordsPage() {
  const { connection, ready } = useConnection()
  const [vault, setVault] = useState<PasswordVaultList | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const load = useCallback(
    async (signal?: AbortSignal, isRefresh = false) => {
      if (!connection) return
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)
      try {
        const data = await getPasswordVault(connection, signal)
        if (!signal?.aborted) {
          setVault(data)
          if (data.lockRequired && !data.secretsVisible) {
            setRevealed({})
          }
        }
      } catch (err) {
        if (!signal?.aborted) setError(formatApiError(err, connection.webUrl ?? connection.apiBaseUrl))
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
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection, load])

  const secretsVisible = vault?.secretsVisible ?? false
  const lockRequired = vault?.lockRequired ?? false
  const pinConfigured = vault?.pinConfigured ?? false
  const statsLoading = loading && !vault
  const entries = vault?.entries ?? []
  const filteredEntries = entries.filter((entry) => entryMatchesQuery(entry, searchQuery))
  const maskStyle = vault?.display?.maskStyle ?? "dots"
  const vaultReady = Boolean(vault) && !statsLoading

  function openVaultUnlock(revealEntryId?: string) {
    setPendingRevealId(revealEntryId ?? null)
    setUnlockOpen(true)
  }

  function onEyeClick(entry: PasswordVaultEntry) {
    if (!entryHasPassword(entry)) return

    const visible = Boolean(secretsVisible && entry.password && revealed[entry.id])
    if (visible) {
      setRevealed((prev) => ({ ...prev, [entry.id]: false }))
      return
    }

    if (secretsVisible) {
      setRevealed((prev) => ({ ...prev, [entry.id]: true }))
      return
    }

    openVaultUnlock(entry.id)
  }

  async function handleUnlock(input: VaultUnlockInput) {
    if (!connection) return

    const revealAfter = pendingRevealId

    if (!secretsVisible) {
      await unlockPasswordVault(connection, input)
    } else {
      await verifyPasswordVault(connection, input)
    }

    await load(undefined, true)
    const fresh = await getPasswordVault(connection)
    setVault(fresh)

    if (revealAfter) {
      const entry = fresh.entries.find((e) => e.id === revealAfter)
      if (entry?.password) {
        setRevealed((prev) => ({ ...prev, [revealAfter]: true }))
      }
    }

    setPendingRevealId(null)
  }

  async function handleLock() {
    if (!connection) return
    await lockPasswordVault(connection)
    setRevealed({})
    await load(undefined, true)
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyMsg(`${label} copied`)
      setTimeout(() => setCopyMsg(null), 2000)
    } catch {
      setCopyMsg("Could not copy")
    }
  }

  const unlockTitle = pendingRevealId && !secretsVisible ? "Unlock to view" : "Unlock vault"
  const unlockDescription = pinConfigured
    ? "Enter your vault PIN. While unlocked, tap the eye on any entry without entering it again."
    : secretsVisible
      ? "Enter your account password to view this password."
      : "Enter your Arciin account password to unlock the vault on this device."

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#717171]"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "rgba(255,79,18,0.12)", border: "1px solid rgba(255,79,18,0.2)" }}
          >
            <FingerprintPattern className="size-[18px] text-[#ff4f12]" />
          </div>
          <div className="min-w-0">
            <h2
              className="text-[20px] font-bold text-[#222222]"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
            >
              Password vault
            </h2>
            <p className="text-[12px] text-[#717171]">
              {statsLoading ? "Loading…" : `${vault?.total ?? 0} saved · instance vault`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load(undefined, true)}
          disabled={loading}
          className="flex size-9 items-center justify-center rounded-xl bg-white text-[#717171]"
          style={{ border: "1px solid #e5e5e5" }}
          aria-label="Refresh"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

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

      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{
          border: "1px solid rgba(255,79,18,0.25)",
          background: "linear-gradient(135deg, #fff7f4 0%, #ffffff 70%)",
        }}
      >
        <div
          className="flex size-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(255,79,18,0.12)" }}
        >
          <FingerprintPattern className="size-5 text-[#ff4f12]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#222222]">Password vault</p>
          <p className="text-[11px] text-[#717171]">
            {!vaultReady
              ? "Loading vault status…"
              : lockRequired && !secretsVisible
                ? "Locked — unlock once to use the eye on entries"
                : "Unlocked — tap the eye to show or hide each password"}
          </p>
        </div>
        {lockRequired ? (
          secretsVisible ? (
            <button
              type="button"
              onClick={() => void handleLock()}
              className="shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-[#717171]"
              style={{ border: "1px solid #e5e5e5", background: "#fff" }}
            >
              Lock
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openVaultUnlock()}
              className="shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{ backgroundColor: "#ff4f12" }}
            >
              Unlock
            </button>
          )
        ) : null}
      </div>

      {!statsLoading && entries.length > 0 ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#a0a0a0]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, URL, or keyword…"
            className="w-full rounded-2xl border border-[#e5e5e5] bg-white py-3 pl-10 pr-10 text-[14px] text-[#222222] outline-none placeholder:text-[#a0a0a0] focus:border-[#ff4f12]"
            autoComplete="off"
            aria-label="Search saved passwords"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#717171] active:bg-[#f7f7f7]"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}


      {statsLoading ? (
        <ul className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-white"
              style={{ border: "1px solid #e5e5e5" }}
            />
          ))}
        </ul>
      ) : entries.length === 0 ? (
        <div
          className="rounded-2xl bg-white px-4 py-14 text-center"
          style={{ border: "1px dashed #e5e5e5" }}
        >
          <FingerprintPattern className="mx-auto mb-3 size-8 text-[#e5e5e5]" />
          <p className="text-[13px] font-medium text-[#222222]">No passwords saved</p>
          <p className="mt-1 text-[12px] text-[#a0a0a0]">
            Add entries from the desktop app under Settings → Passwords.
          </p>
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
              maskStyle={maskStyle}
              secretsVisible={secretsVisible}
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
            setPendingRevealId(null)
          }}
          onUnlock={handleUnlock}
        />
      ) : null}
    </div>
  )
}
