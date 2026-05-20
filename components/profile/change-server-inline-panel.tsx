"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Plus, Server } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import {
  connectionFromAccount,
  getActiveAccountId,
  setActiveAccount,
  type MobileAccount,
} from "@/lib/connection/accounts"
import { displayServerLabel } from "@/lib/connection/normalize-url"
import { isConnectionExpired } from "@/lib/connection/storage"

function serverSubtitle(account: MobileAccount): string {
  return displayServerLabel(account.server.apiBaseUrl, account.server.instanceName)
}

export function ChangeServerInlinePanel({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const { connection, accounts, switchAccount, refresh } = useConnection()
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const activeId = getActiveAccountId()

  useEffect(() => {
    if (!enabled) return
    setError(null)
    setMessage(null)
  }, [enabled, connection?.apiBaseUrl])

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
          Tap a server to switch — like switching accounts. No sign-in needed if that server is
          still signed in on this phone.
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

            return (
              <li key={account.id}>
                <button
                  type="button"
                  disabled={Boolean(switchingId) || (isActive && Boolean(connection))}
                  onClick={() => void handleSwitch(account)}
                  className="flex w-full items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-left active:bg-[#f7f7f7] disabled:opacity-60"
                  style={{
                    border: isActive
                      ? "1.5px solid rgba(255,79,18,0.45)"
                      : "1px solid #e5e5e5",
                    backgroundColor: isActive ? "#fff7f4" : "#ffffff",
                  }}
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(255,79,18,0.12)"
                        : "rgba(255,79,18,0.08)",
                    }}
                  >
                    <Server className="size-5 text-[#ff4f12]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#222222]">
                      {account.server.instanceName}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-[#a0a0a0]">
                      {serverSubtitle(account)}
                    </p>
                    {!hasSession && !isActive ? (
                      <p className="mt-1 text-[10px] text-[#b45309]">Sign in required</p>
                    ) : null}
                  </div>
                  {busy ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-[#a0a0a0]" />
                  ) : isActive ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ff4f12]">
                      <Check className="size-3.5 text-white" />
                    </span>
                  ) : null}
                </button>
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
    </div>
  )
}
