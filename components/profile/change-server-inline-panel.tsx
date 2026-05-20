"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Server } from "lucide-react"

import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { serverAddressFromProfile } from "@/lib/connection/reconnect-server"
import { loadServerProfile } from "@/lib/connection/storage"
import { dispatchAppForeground } from "@/lib/hooks/use-app-foreground"

export function ChangeServerInlinePanel({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const { connection, reconnectServer, refresh, forgetServer, serverReachable } = useConnection()

  const [serverAddress, setServerAddress] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const profile = loadServerProfile()

  useEffect(() => {
    if (!enabled) return
    setServerAddress(serverAddressFromProfile())
    setMessage(null)
    setError(null)
  }, [enabled, connection?.apiBaseUrl])

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    setMessage(null)
    try {
      const result = await reconnectServer(serverAddress)
      if (result.status === "connected") {
        setMessage("Connected. Your session is still active — no pairing code needed.")
        dispatchAppForeground()
        await refresh()
        return
      }
      if (result.status === "need_sign_in") {
        setMessage("Server updated. Sign in with your email and password on this instance.")
        router.push("/sign-in")
        return
      }
      setError(result.message)
    } catch (err) {
      setError(formatApiError(err, serverAddress))
    } finally {
      setConnecting(false)
    }
  }

  function handleSetupNewServer() {
    forgetServer()
    router.push("/sign-in?new=1")
  }

  if (!enabled) return null

  return (
    <div className="flex flex-col gap-4">
      <SettingsIntroCard
        icon={Server}
        title="Change server"
        description="Switch to another Arciin server you already use, or set up this phone again with a new server."
      />

      {serverReachable === false ? (
        <p className="text-[12px] text-[#b45309]">
          Cannot reach this server right now. Paste an updated URL below.
        </p>
      ) : null}

      <div className="space-y-3">
        <div>
          <label htmlFor="change-server-url" className="text-[12px] font-semibold text-[#222222]">
            New server address
          </label>
          <input
            id="change-server-url"
            type="url"
            value={serverAddress}
            onChange={(e) => setServerAddress(e.target.value)}
            placeholder="http://192.168.1.10:3004 or https://your-server.example.com"
            className="mt-1.5 w-full rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[13px] text-[#222222] outline-none focus:ring-2 focus:ring-[#ff4f12]/30"
            style={{ border: "1px solid #e5e5e5" }}
            autoComplete="url"
            inputMode="url"
          />
        </div>
        <button
          type="button"
          disabled={connecting || !serverAddress.trim()}
          onClick={() => void handleConnect()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ff4f12] text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {connecting ? <Loader2 className="size-4 animate-spin" /> : null}
          {connecting ? "Connecting…" : "Connect to this server"}
        </button>
        {error ? <p className="text-[12px] text-[#b91c1c]">{error}</p> : null}
        {message ? <p className="text-[12px] text-[#15803d]">{message}</p> : null}
        <p className="text-[11px] leading-relaxed text-[#a0a0a0]">
          Updates the saved address. If your session is still valid, you stay signed in.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSetupNewServer}
        className="w-full rounded-xl py-3 text-center text-[13px] font-semibold text-[#717171] active:bg-[#f7f7f7]"
        style={{ border: "1px solid #e5e5e5" }}
      >
        Set up a new server
      </button>
    </div>
  )
}