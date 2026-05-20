"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Plus, Server, Trash2 } from "lucide-react"

import { RemoveServerSheet } from "@/components/profile/remove-server-sheet"
import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import {
  connectionFromAccount,
  getActiveAccountId,
  setActiveAccount,
  type MobileAccount,
} from "@/lib/connection/accounts"
import { displayServerLabel } from "@/lib/connection/normalize-url"
import { probeServerReachable } from "@/lib/connection/probe-server"
import { isConnectionExpired } from "@/lib/connection/storage"
import { cn } from "@/lib/utils"

type ProbeStatus = "checking" | "online" | "offline"

function serverSubtitle(account: MobileAccount): string {
  return displayServerLabel(account.server.apiBaseUrl, account.server.instanceName)
}

function ServerStatusBadge({
  label,
  tone,
}: {
  label: string
  tone: "connected" | "offline" | "signed_out" | "available" | "checking"
}) {
  const styles: Record<typeof tone, { bg: string; color: string }> = {
    connected: { bg: "#dcfce7", color: "#15803d" },
    offline: { bg: "#f4f4f5", color: "#71717a" },
    signed_out: { bg: "#fffbeb", color: "#b45309" },
    available: { bg: "#eff6ff", color: "#2563eb" },
    checking: { bg: "#f7f7f7", color: "#a0a0a0" },
  }
  const s = styles[tone]
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {label}
    </span>
  )
}

function resolveServerStatus(
  account: MobileAccount,
  isActive: boolean,
  probe: ProbeStatus | undefined,
  hasSession: boolean,
  serverReachable: boolean | null,
): { label: string; tone: "connected" | "offline" | "signed_out" | "available" | "checking" } {
  if (isActive && serverReachable === false) {
    return { label: "Offline", tone: "offline" }
  }
  if (isActive && serverReachable === true && hasSession) {
    return { label: "Connected", tone: "connected" }
  }
  if (isActive && serverReachable === null && hasSession) {
    return { label: "Checking…", tone: "checking" }
  }

  if (probe === "checking") {
    return { label: "Checking…", tone: "checking" }
  }
  if (probe === "offline") {
    return { label: "Offline", tone: "offline" }
  }

  if (!hasSession) {
    return { label: "Not signed in", tone: "signed_out" }
  }

  if (isActive && hasSession) {
    return { label: "Connected", tone: "connected" }
  }

  return { label: "Available", tone: "available" }
}

export function ChangeServerInlinePanel({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const { connection, accounts, switchAccount, deleteServer, serverReachable, refresh } =
    useConnection()
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [probeById, setProbeById] = useState<Record<string, ProbeStatus>>({})
  const [removeTarget, setRemoveTarget] = useState<MobileAccount | null>(null)

  const activeId = getActiveAccountId()

  useEffect(() => {
    if (!enabled) return
    setError(null)
    setMessage(null)
  }, [enabled, connection?.apiBaseUrl])

  useEffect(() => {
    if (!enabled || accounts.length === 0) return

    const controller = new AbortController()
    const next: Record<string, ProbeStatus> = {}
    for (const account of accounts) {
      next[account.id] = "checking"
    }
    setProbeById(next)

    void (async () => {
      const results = await Promise.all(
        accounts.map(async (account) => {
          const online = await probeServerReachable(account.server.apiBaseUrl, controller.signal)
          return { id: account.id, online }
        }),
      )
      if (controller.signal.aborted) return
      setProbeById((prev) => {
        const merged = { ...prev }
        for (const { id, online } of results) {
          merged[id] = online ? "online" : "offline"
        }
        return merged
      })
    })()

    return () => controller.abort()
  }, [enabled, accounts])

  const handleSwitch = useCallback(
    async (account: MobileAccount) => {
      if (account.id === activeId && connection) return
      setSwitchingId(account.id)
      setError(null)
      setMessage(null)
      try {
        const conn = connectionFromAccount(account)
        if (!conn || isConnectionExpired(conn)) {
          setActiveAccount(account.id)
          router.push("/sign-in")
          return
        }
        const ok = await switchAccount(account.id)
        if (ok) {
          setMessage(`Switched to ${account.server.instanceName}.`)
          await refresh()
        } else {
          router.push("/sign-in")
        }
      } catch (err) {
        setError(formatApiError(err))
      } finally {
        setSwitchingId(null)
      }
    },
    [activeId, connection, refresh, router, switchAccount],
  )

  async function handleRemoveServer(account: MobileAccount) {
    const onlyServer = accounts.length <= 1
    deleteServer(account.id)
    setMessage(`Removed ${account.server.instanceName} from this phone.`)
    if (onlyServer) {
      router.push("/sign-in")
    }
  }

  function handleAddServer() {
    router.push("/sign-in?new=1")
  }

  if (!enabled) return null

  const sorted = [...accounts].sort((a, b) => {
    if (a.id === activeId) return -1
    if (b.id === activeId) return 1
    return Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt)
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[13px] font-semibold text-[#222222]">Your servers</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
          Tap a server to switch. Offline servers stay saved — sign in again when they are back, or
          remove them from this phone.
        </p>
      </div>

      {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}
      {message ? <p className="text-[12px] text-[#15803d]">{message}</p> : null}

      <ul className="flex flex-col gap-2">
        {sorted.length === 0 ? (
          <li
            className="rounded-xl px-4 py-3 text-[13px] text-[#717171]"
            style={{ border: "1px solid #e5e5e5", backgroundColor: "#f7f7f7" }}
          >
            No servers saved yet. Set up your first Arciin server below.
          </li>
        ) : (
          sorted.map((account) => {
            const isActive = account.id === activeId
            const accountConn = connectionFromAccount(account)
            const hasSession = Boolean(
              accountConn && account.session && !isConnectionExpired(accountConn),
            )
            const busy = switchingId === account.id
            const probe = probeById[account.id]
            const status = resolveServerStatus(
              account,
              isActive,
              probe,
              hasSession,
              isActive ? serverReachable : null,
            )

            return (
              <li key={account.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl bg-white pr-2",
                    isActive && "ring-1 ring-[#ff4f12]/30",
                  )}
                  style={{
                    border: isActive
                      ? "1.5px solid rgba(255,79,18,0.45)"
                      : "1px solid #e5e5e5",
                    backgroundColor: isActive ? "#fff7f4" : "#ffffff",
                  }}
                >
                  <button
                    type="button"
                    disabled={Boolean(switchingId) || (isActive && Boolean(connection))}
                    onClick={() => void handleSwitch(account)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3 text-left active:bg-[#f7f7f7] disabled:opacity-60"
                  >
                    <div
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: isActive
                          ? "rgba(255,79,18,0.12)"
                          : "rgba(255,79,18,0.08)",
                      }}
                    >
                      <Server
                        className={cn(
                          "size-5",
                          status.tone === "offline" ? "text-[#a0a0a0]" : "text-[#ff4f12]",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-[#222222]">
                          {account.server.instanceName}
                        </p>
                        <ServerStatusBadge label={status.label} tone={status.tone} />
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-[#a0a0a0]">
                        {serverSubtitle(account)}
                      </p>
                    </div>
                    {busy ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-[#a0a0a0]" />
                    ) : isActive ? (
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ff4f12]">
                        <Check className="size-3.5 text-white" />
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(switchingId)}
                    onClick={() => setRemoveTarget(account)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#a0a0a0] active:bg-[#fef2f2] active:text-[#b91c1c] disabled:opacity-40"
                    aria-label={`Remove ${account.server.instanceName}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            )
          })
        )}
      </ul>

      <button
        type="button"
        onClick={handleAddServer}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-[#717171] active:bg-[#f7f7f7]"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <Plus className="size-4" />
        Set up another server
      </button>

      <RemoveServerSheet
        open={Boolean(removeTarget)}
        account={removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={async () => {
          if (!removeTarget) return
          await handleRemoveServer(removeTarget)
        }}
      />
    </div>
  )
}
