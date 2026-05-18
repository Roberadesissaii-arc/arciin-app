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
  Lock,
  RefreshCw,
} from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import {
  getPasswordVault,
  lockPasswordVault,
  unlockPasswordVault,
  type PasswordVaultEntry,
  type PasswordVaultList,
  type VaultUnlockInput,
} from "@/lib/api/password-vault"

function maskPassword(entry: PasswordVaultEntry) {
  const len = entry.password?.length ?? entry.passwordLength ?? 10
  return "•".repeat(Math.min(Math.max(len, 8), 16))
}

function UnlockSheet({
  pinConfigured,
  onClose,
  onUnlock,
}: {
  pinConfigured: boolean
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white px-5 pb-8 pt-5"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Lock className="size-5 text-[#ff4f12]" />
          <h3 className="text-[17px] font-bold text-[#222222]">Unlock vault</h3>
        </div>
        <p className="mb-4 text-[13px] text-[#717171]">
          {pinConfigured
            ? "Enter your vault PIN to view and copy passwords."
            : "Enter your Arciin account password to view and copy vault secrets."}
        </p>
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
          Unlock
        </button>
      </div>
    </div>
  )
}

function EntryRow({
  entry,
  secretsVisible,
  revealed,
  onToggleReveal,
  onCopy,
}: {
  entry: PasswordVaultEntry
  secretsVisible: boolean
  revealed: boolean
  onToggleReveal: () => void
  onCopy: (text: string, label: string) => void
}) {
  const canShowPassword = secretsVisible && entry.password
  const displayPassword = revealed && canShowPassword ? entry.password! : maskPassword(entry)

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

      <div
        className="mt-3 flex items-center gap-2 rounded-xl bg-[#f7f7f7] px-3 py-2"
        style={{ border: "1px solid #ececec" }}
      >
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-[#222222]">
          {displayPassword}
        </span>
        {secretsVisible && (entry.password || entry.hasPassword) ? (
          <button
            type="button"
            onClick={onToggleReveal}
            className="shrink-0 p-1 text-[#717171]"
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        ) : null}
        {canShowPassword && revealed ? (
          <button
            type="button"
            onClick={() => onCopy(entry.password!, "Password")}
            className="shrink-0 p-1 text-[#717171]"
            aria-label="Copy password"
          >
            <Copy className="size-4" />
          </button>
        ) : null}
      </div>

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
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

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
        if (!signal?.aborted) setError(formatApiError(err))
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
  const entries = vault?.entries ?? []

  async function handleUnlock(input: VaultUnlockInput) {
    if (!connection) return
    await unlockPasswordVault(connection, input)
    await load(undefined, true)
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

  const statsLoading = loading && !vault

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
        <div className="min-w-0 flex-1">
          <h2
            className="text-[20px] font-bold text-[#222222]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            Passwords
          </h2>
          <p className="text-[12px] text-[#717171]">
            {statsLoading ? "Loading…" : `${vault?.total ?? 0} saved · instance vault`}
          </p>
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
            {lockRequired && !secretsVisible
              ? "Locked — unlock to view secrets"
              : "Secrets visible on this device"}
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
              onClick={() => setUnlockOpen(true)}
              className="shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{ backgroundColor: "#ff4f12" }}
            >
              Unlock
            </button>
          )
        ) : null}
      </div>

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
            Import or add entries from the desktop app under Settings → Passwords.
          </p>
        </div>
      ) : (
        <ul className={`flex flex-col gap-3 ${refreshing ? "opacity-60" : ""}`}>
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              secretsVisible={secretsVisible}
              revealed={Boolean(revealed[entry.id])}
              onToggleReveal={() =>
                setRevealed((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
              }
              onCopy={copyText}
            />
          ))}
        </ul>
      )}

      {unlockOpen ? (
        <UnlockSheet
          pinConfigured={pinConfigured}
          onClose={() => setUnlockOpen(false)}
          onUnlock={handleUnlock}
        />
      ) : null}
    </div>
  )
}
