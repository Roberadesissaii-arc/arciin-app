"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Globe, Server } from "lucide-react"

import {
  AuthMobileCardHeader,
  AuthMobileShell,
} from "@/components/auth/auth-mobile-shell"
import { AuthMobileField, AuthMobileFormMessage } from "@/components/auth/auth-mobile-field"
import { ConnectionSuccessScreen } from "@/components/auth/connection-success-screen"
import { formatApiError } from "@/lib/api/errors"
import { useConnection } from "@/components/providers/connection-provider"
import { reconnectToServer } from "@/lib/connection/reconnect-server"
import { displayServerLabel } from "@/lib/connection/normalize-url"
import { loadServerProfile } from "@/lib/connection/storage"

const SERVER_NOT_SETUP =
  "This Arciin server has not been claimed yet. Open the Arciin web app on your server (desktop browser) and complete first-run setup there first."

export function MobileConnectPage() {
  const router = useRouter()
  const { applyAuth } = useConnection()

  const [serverInput, setServerInput] = useState(() => {
    const saved = loadServerProfile()
    if (!saved) return ""
    return saved.webUrl ?? saved.apiBaseUrl.replace(/\/api\/?$/i, "")
  })
  const [connecting, setConnecting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [connectedUrl, setConnectedUrl] = useState("")
  const [connectedInstance, setConnectedInstance] = useState("Arciin")

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const trimmed = serverInput.trim()
    if (!trimmed) {
      setFormError("Enter your Arciin server address.")
      return
    }

    setConnecting(true)
    try {
      const result = await reconnectToServer(trimmed)
      if (result.status === "connected") {
        applyAuth(
          {
            sessionToken: result.connection.sessionToken,
            sessionExpiresAt: result.connection.sessionExpiresAt,
            user: result.connection.user,
            server: {
              instanceName: result.connection.instanceName,
              apiBaseUrl: result.connection.apiBaseUrl,
              socketUrl: result.connection.socketUrl,
              webUrl: result.connection.webUrl,
              version: "",
              requestOrigin: result.connection.webUrl,
            },
          },
          result.connection.apiBaseUrl,
        )
        setConnectedInstance(result.connection.instanceName)
        setConnectedUrl(
          displayServerLabel(result.connection.apiBaseUrl, result.connection.instanceName),
        )
        setShowSuccess(true)
        return
      }

      if (result.status === "need_sign_in") {
        router.replace("/sign-in")
        return
      }

      const message = result.message
      if (message.toLowerCase().includes("not been set up")) {
        setFormError(SERVER_NOT_SETUP)
      } else {
        setFormError(message)
      }
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setConnecting(false)
    }
  }

  if (showSuccess) {
    return (
      <ConnectionSuccessScreen
        embedded
        instanceName={connectedInstance}
        serverUrl={connectedUrl}
        onComplete={() => router.replace("/home")}
      />
    )
  }

  return (
    <AuthMobileShell>
      <AuthMobileCardHeader
        title="Connect to Arciin"
        subtitle="This app is a client. Point it at your self-hosted Arciin server — it never creates or owns the database."
      />

      <form onSubmit={handleConnect} className="mt-5 flex flex-1 flex-col gap-3.5">
        <AuthMobileField
          id="connect-server"
          label="Server address"
          icon={Globe}
          type="text"
          placeholder="192.168.1.10 or https://arciin.example.com"
          value={serverInput}
          onChange={setServerInput}
          autoComplete="url"
        />

        <AuthMobileFormMessage message={formError} />

        <button type="submit" disabled={connecting} className="auth-primary-button">
          {connecting ? "Connecting…" : "Connect"}
        </button>

        <div className="rounded-2xl border border-[#efefef] bg-[#fafafa] p-4 text-[12px] leading-relaxed text-[#717171]">
          <div className="mb-2 flex items-center gap-2 font-medium text-[#444444]">
            <Server className="size-4 text-[#ff4f12]" />
            First time on this server?
          </div>
          <p>
            Install and claim Arciin on your mini PC or home server first. Then return here to
            connect this phone — all data stays on the server API, not on this device.
          </p>
        </div>
      </form>
    </AuthMobileShell>
  )
}
