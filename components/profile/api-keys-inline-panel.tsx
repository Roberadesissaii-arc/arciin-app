"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Copy, Key, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { useConnection } from "@/components/providers/connection-provider"
import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { formatApiError } from "@/lib/api/errors"
import {
  createApiKey,
  getApiKeys,
  getApiProtectionStatus,
  revokeApiKey,
  rotateApiKey,
} from "@/lib/api/settings"
import type { ApiKeySummary } from "@/lib/types/models"
import { copyTextWithFallback } from "@/lib/utils/clipboard"
import { generateApiKeyName } from "@/lib/utils/generate-api-key-name"
import { formatRelativeDate } from "@/lib/utils/format-date"

const ALL_SCOPES = [
  { id: "assets:read", label: "Assets (read)" },
  { id: "assets:write", label: "Assets (write)" },
  { id: "libraries:read", label: "Libraries (read)" },
  { id: "libraries:write", label: "Libraries (write)" },
  { id: "uploads:create", label: "Uploads (create)" },
  { id: "activity:read", label: "Activity (read)" },
  { id: "events:subscribe", label: "Events (subscribe)" },
  { id: "admin", label: "Admin" },
]

function defaultExpiryIso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

function CreateKeySheet({
  open,
  onClose,
  onCreate,
  busy,
  requireExpiry,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, scopes: string[], expiresAt?: string) => Promise<boolean>
  busy: boolean
  requireExpiry: boolean
}) {
  const [name, setName] = useState(() => generateApiKeyName())
  const [scopes, setScopes] = useState<string[]>(["assets:read"])
  const [expiresAt, setExpiresAt] = useState(() => defaultExpiryIso(90))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(generateApiKeyName())
      setScopes(["assets:read"])
      setExpiresAt(defaultExpiryIso(90))
      setError(null)
    }
  }, [open])

  function toggleScope(id: string) {
    setScopes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="New API key"
      description="Name is auto-generated — tap refresh to change it."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="key-name" className="text-[12px] font-semibold text-[#717171]">
            Key name
          </label>
          <div className="flex gap-2">
            <input
              id="key-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] outline-none"
              style={{ border: "1px solid #e5e5e5" }}
            />
            <button
              type="button"
              onClick={() => setName(generateApiKeyName())}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#717171] active:bg-[#ececec]"
              style={{ border: "1px solid #e5e5e5" }}
              aria-label="Generate new name"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-semibold text-[#717171]">Scopes</p>
          <div className="flex flex-wrap gap-2">
            {ALL_SCOPES.map((scope) => {
              const active = scopes.includes(scope.id)
              return (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => toggleScope(scope.id)}
                  className="rounded-xl px-3 py-1.5 text-[12px] font-medium"
                  style={{
                    backgroundColor: active ? "var(--arciin-accent-badge-bg)" : "#f7f7f7",
                    border: `1px solid ${active ? "var(--arciin-accent-ring)" : "#e5e5e5"}`,
                    color: active ? "var(--arciin-accent)" : "#717171",
                  }}
                >
                  {scope.label}
                </button>
              )
            })}
          </div>
        </div>
        {requireExpiry ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="key-expiry" className="text-[12px] font-semibold text-[#717171]">
              Expires on
            </label>
            <input
              id="key-expiry"
              type="date"
              value={expiresAt}
              min={defaultExpiryIso(1)}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] outline-none"
              style={{ border: "1px solid #e5e5e5" }}
            />
            <p className="text-[11px] text-[#a0a0a0]">
              This instance requires an expiry date on new API keys.
            </p>
          </div>
        ) : null}
        {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}
        <button
          type="button"
          disabled={!name.trim() || scopes.length === 0 || busy || (requireExpiry && !expiresAt)}
          className="btn-accent-solid flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold disabled:opacity-40"
          onClick={() => {
            void (async () => {
              setError(null)
              const expiryIso = requireExpiry && expiresAt ? new Date(expiresAt).toISOString() : undefined
              const ok = await onCreate(name.trim(), scopes, expiryIso)
              if (!ok) setError("Could not create key.")
            })()
          }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />}
          Create key
        </button>
      </div>
    </MobileBottomSheet>
  )
}

function RawKeySheet({
  rawKey,
  onClose,
  onCopy,
}: {
  rawKey: string
  onClose: () => void
  onCopy: () => void
}) {
  return (
    <MobileBottomSheet
      open
      onClose={onClose}
      title="New API key"
      description="Copy this key now. You will not be able to see it again."
    >
      <code className="block break-all rounded-xl bg-[#f7f7f7] px-3 py-3 font-mono text-[12px] leading-relaxed text-[#222222]">
        {rawKey}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="btn-accent-solid mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold"
      >
        <Copy className="size-4" />
        Copy key
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full py-2 text-center text-[13px] font-medium text-[#717171]"
      >
        Done
      </button>
    </MobileBottomSheet>
  )
}

function ApiKeyCard({
  keyRow,
  revoking,
  rotating,
  onRevoke,
  onRotate,
}: {
  keyRow: ApiKeySummary
  revoking: boolean
  rotating: boolean
  onRevoke: () => void
  onRotate: () => void
}) {
  return (
    <li
      className="rounded-xl bg-[#f7f7f7] p-3"
      style={{ border: "1px solid #e5e5e5" }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <Key className="size-4 text-[#717171]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold text-[#222222]">{keyRow.name}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={rotating || revoking}
                onClick={onRotate}
                className="flex size-7 items-center justify-center rounded-lg text-[#717171] active:bg-[#f7f7f7] disabled:opacity-50"
                style={{ border: "1px solid #e5e5e5" }}
                aria-label="Rotate key"
              >
                <RefreshCw className={`size-[14px] ${rotating ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                disabled={revoking || rotating}
                onClick={onRevoke}
                className="flex size-7 items-center justify-center rounded-lg text-[#dc2626] active:bg-red-50 disabled:opacity-50"
                style={{ border: "1px solid #fecaca" }}
                aria-label="Revoke key"
              >
                <Trash2 className="size-[14px]" />
              </button>
            </div>
          </div>
          <code
            className="mt-1 inline-block rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-[#717171]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            {keyRow.keyPrefix}••••••••
          </code>
          <div className="mt-2 flex flex-wrap gap-1">
            {keyRow.scopes.map((scope) => (
              <span
                key={scope}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium text-[#717171]"
                style={{ backgroundColor: "#fff", border: "1px solid #e5e5e5" }}
              >
                {scope}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[#a0a0a0]">
            Created {formatRelativeDate(keyRow.createdAt)}
            {keyRow.lastUsedAt ? ` · Used ${formatRelativeDate(keyRow.lastUsedAt)}` : ""}
          </p>
        </div>
      </div>
    </li>
  )
}

function ApiKeysPanelContent({
  connection,
  ready,
  sessionKey,
}: {
  connection: ReturnType<typeof useConnection>["connection"]
  ready: boolean
  sessionKey: string | null
}) {
  const connectionRef = useRef(connection)
  connectionRef.current = connection

  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requireKeyExpiry, setRequireKeyExpiry] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [rotatingId, setRotatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const conn = connectionRef.current
    if (!conn) return
    setLoading(true)
    setError(null)
    try {
      const [list, protection] = await Promise.all([
        getApiKeys(conn),
        getApiProtectionStatus(conn).catch(() => null),
      ])
      setKeys(list.filter((k) => !k.revokedAt))
      setRequireKeyExpiry(Boolean(protection?.requireApiKeyExpiry))
    } catch (err) {
      setKeys([])
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !sessionKey) return
    void load()
  }, [ready, sessionKey, load])

  async function handleCreate(name: string, scopes: string[], expiresAt?: string) {
    const conn = connectionRef.current
    if (!conn) return false
    setCreating(true)
    try {
      const result = await createApiKey(conn, { name, scopes, expiresAt })
      setRawKey(result.rawKey)
      setShowCreate(false)
      await load()
      return true
    } catch (err) {
      setError(formatApiError(err))
      return false
    } finally {
      setCreating(false)
    }
  }

  async function handleRotate(id: string) {
    const conn = connectionRef.current
    if (!conn) return
    const ok = window.confirm("Rotate this API key? The old key stops working immediately.")
    if (!ok) return
    setRotatingId(id)
    try {
      const result = await rotateApiKey(conn, id)
      setRawKey(result.rawKey)
      await load()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setRotatingId(null)
    }
  }

  async function handleRevoke(id: string) {
    const conn = connectionRef.current
    if (!conn) return
    const ok = window.confirm("Revoke this API key? Apps using it will stop working.")
    if (!ok) return
    setRevokingId(id)
    try {
      await revokeApiKey(conn, id)
      setKeys((prev) => (prev ? prev.filter((k) => k.id !== id) : prev))
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setRevokingId(null)
    }
  }

  async function copyText(text: string) {
    await copyTextWithFallback(text)
  }

  if (keys === null && loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  const list = keys ?? []

  return (
    <>
      <CreateKeySheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        busy={creating}
        requireExpiry={requireKeyExpiry}
      />

      {rawKey ? (
        <RawKeySheet
          rawKey={rawKey}
          onClose={() => setRawKey(null)}
          onCopy={() => void copyText(rawKey)}
        />
      ) : null}

      <div className="flex flex-col gap-4">
        <SettingsIntroCard
          icon={Key}
          title="API keys"
          description="Same keys as on your desktop Arciin server. Create, view prefixes, and revoke keys here."
        />

        {error && list.length === 0 ? (
          <MutedPanelError error={error} onRetry={() => void load()} />
        ) : error ? (
          <p
            className="rounded-xl px-3 py-2 text-[12px] text-[#b91c1c]"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
          >
            {error}
          </p>
        ) : null}

        {list.length === 0 && !error ? (
          <div
            className="flex flex-col items-center gap-2 rounded-xl py-8"
            style={{ border: "1px dashed #e5e5e5", backgroundColor: "#fafafa" }}
          >
            <Key className="size-8 text-[#e5e5e5]" />
            <p className="text-[13px] text-[#717171]">No API keys on this instance</p>
            <p className="max-w-[240px] text-center text-[11px] text-[#a0a0a0]">
              Create a key with the button below. Scopes control what each key can access.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((k) => (
              <ApiKeyCard
                key={k.id}
                keyRow={k}
                revoking={revokingId === k.id}
                rotating={rotatingId === k.id}
                onRevoke={() => void handleRevoke(k.id)}
                onRotate={() => void handleRotate(k.id)}
              />
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="btn-accent-solid flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold active:opacity-90"
        >
          <Plus className="size-4" />
          Create new key
        </button>
      </div>
    </>
  )
}

export function ApiKeysInlinePanel({ enabled }: { enabled: boolean }) {
  const { connection, ready } = useConnection()
  const sessionKey = connection?.sessionToken ?? null

  if (!enabled) return null

  return (
    <AdminSettingsGate feature="API keys">
      <ApiKeysPanelContent connection={connection} ready={ready} sessionKey={sessionKey} />
    </AdminSettingsGate>
  )
}
