"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, Key, Loader2, Plus, Trash2, X } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { createApiKey, getApiKeys, revokeApiKey } from "@/lib/api/settings"
import type { ApiKeySummary } from "@/lib/types/models"
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

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
      {label}
    </p>
  )
}

function CreateModal({
  onClose,
  onCreate,
  busy,
}: {
  onClose: () => void
  onCreate: (name: string, scopes: string[]) => Promise<string | null>
  busy: boolean
}) {
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<string[]>(["assets:read"])
  const [error, setError] = useState<string | null>(null)

  function toggleScope(id: string) {
    setScopes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-8"
        style={{ borderTop: "1px solid #e5e5e5" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[16px] font-bold text-[#222222]">New API key</p>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl text-[#717171] active:bg-[#f7f7f7]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="key-name" className="text-[12px] font-semibold text-[#717171]">
              Key name
            </label>
            <input
              id="key-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile app"
              className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none placeholder-[#a0a0a0]"
              style={{ border: "1px solid #e5e5e5" }}
            />
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
                    className="rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors"
                    style={{
                      backgroundColor: active ? "rgba(255,79,18,0.1)" : "#f7f7f7",
                      border: `1px solid ${active ? "rgba(255,79,18,0.4)" : "#e5e5e5"}`,
                      color: active ? "#ff4f12" : "#717171",
                    }}
                  >
                    {scope.label}
                  </button>
                )
              })}
            </div>
          </div>

          {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}

          <button
            type="button"
            disabled={!name.trim() || scopes.length === 0 || busy}
            className="mt-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold text-white disabled:opacity-40 active:opacity-80"
            style={{ backgroundColor: "#ff4f12" }}
            onClick={() => {
              void (async () => {
                setError(null)
                const raw = await onCreate(name.trim(), scopes)
                if (raw === null) setError("Could not create key.")
              })()
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />}
            Create key
          </button>
        </div>
      </div>
    </div>
  )
}

export function ApiKeysPage() {
  const { connection, ready } = useConnection()
  const [keys, setKeys] = useState<ApiKeySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [rawKey, setRawKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!connection) return
    setLoading(true)
    setError(null)
    try {
      const list = await getApiKeys(connection)
      setKeys(list.filter((k) => !k.revokedAt))
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [connection])

  useEffect(() => {
    if (!ready || !connection) return
    void load()
  }, [connection, ready, load])

  async function handleCreate(name: string, scopes: string[]) {
    if (!connection) return null
    setCreating(true)
    try {
      const result = await createApiKey(connection, { name, scopes })
      setRawKey(result.rawKey)
      setShowCreate(false)
      await load()
      return result.rawKey
    } catch (err) {
      setError(formatApiError(err))
      return null
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!connection) return
    const ok = window.confirm("Revoke this API key? Apps using it will stop working.")
    if (!ok) return
    setRevokingId(id)
    try {
      await revokeApiKey(connection, id)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setRevokingId(null)
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  return (
    <>
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          busy={creating}
        />
      )}

      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-white p-4" style={{ border: "1px solid #e5e5e5" }}>
          <p className="text-[13px] leading-relaxed text-[#717171]">
            API keys allow external apps to access your Arciin instance. Keys are shown in full
            only once — store them safely.
          </p>
        </div>

        {rawKey ? (
          <div
            className="rounded-2xl bg-white p-4"
            style={{ border: "1px solid #bbf7d0", backgroundColor: "#f0fdf4" }}
          >
            <p className="text-[12px] font-semibold text-[#15803d]">Copy your new key now</p>
            <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 font-mono text-[11px] text-[#222222]">
              {rawKey}
            </code>
            <button
              type="button"
              onClick={() => void copyText(rawKey)}
              className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#15803d]"
            >
              <Copy className="size-3.5" />
              Copy to clipboard
            </button>
            <button
              type="button"
              onClick={() => setRawKey(null)}
              className="mt-2 text-[11px] text-[#717171] underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div>
          <SectionLabel label="Your keys" />
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-[#a0a0a0]" />
            </div>
          ) : keys.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white py-10"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <Key className="size-8 text-[#e5e5e5]" />
              <p className="text-[13px] text-[#a0a0a0]">No API keys yet</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white" style={{ border: "1px solid #e5e5e5" }}>
              {keys.map((key, i) => (
                <div key={key.id}>
                  {i > 0 && <div className="mx-4 h-px bg-[#f0f0f0]" />}
                  <div className="flex flex-col gap-2 px-4 py-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[14px] font-semibold text-[#222222]">{key.name}</p>
                      <button
                        type="button"
                        disabled={revokingId === key.id}
                        onClick={() => void handleRevoke(key.id)}
                        className="flex size-7 items-center justify-center rounded-xl text-[#dc2626] active:bg-red-50 disabled:opacity-50"
                        aria-label="Revoke key"
                      >
                        <Trash2 className="size-[14px]" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code
                        className="rounded-lg px-2.5 py-1 font-mono text-[12px] text-[#717171]"
                        style={{ backgroundColor: "#f7f7f7", border: "1px solid #e5e5e5" }}
                      >
                        {key.keyPrefix}••••••••
                      </code>
                      <button
                        type="button"
                        aria-label="Copy key prefix"
                        onClick={() => void copyText(key.keyPrefix)}
                        className="flex size-7 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#f7f7f7]"
                      >
                        <Copy className="size-[13px]" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-[#717171]"
                          style={{ backgroundColor: "#f7f7f7", border: "1px solid #e5e5e5" }}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3 text-[11px] text-[#a0a0a0]">
                      <span>Created {formatRelativeDate(key.createdAt)}</span>
                      {key.lastUsedAt ? (
                        <span>· Last used {formatRelativeDate(key.lastUsedAt)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <p
            className="rounded-xl px-4 py-3 text-center text-[12px] text-[#b91c1c]"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold text-white active:opacity-80"
          style={{ backgroundColor: "#ff4f12" }}
        >
          <Plus className="size-4" />
          Create new key
        </button>
      </div>
    </>
  )
}
