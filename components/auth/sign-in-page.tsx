"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronLeft, Eye, EyeOff, Globe, Key, Lock, Mail, Server } from "lucide-react"

import { formatApiError } from "@/lib/api/errors"
import { discoverServer, pairMobileDevice, loginMobileDevice } from "@/lib/api/mobile"
import {
  deriveMobileServerUrlsFromApiBase,
  displayServerLabel,
  isLoopbackApiBase,
  isPublicServerAddress,
} from "@/lib/connection/normalize-url"
import { authWithClientApiBase } from "@/lib/connection/merge-auth"
import {
  hasStoredServer,
  loadServerProfile,
  saveServerProfile,
} from "@/lib/connection/storage"
import { BrandHeroCarousel } from "@/components/auth/brand-hero"
import { LoginDomainChip } from "@/components/connection/saved-server-chip"
import { useConnection } from "@/components/providers/connection-provider"

function SuccessScreen({ serverUrl }: { serverUrl: string }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center pt-safe pb-safe"
      style={{ backgroundColor: "#f7f7f7" }}
    >
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 280,
          height: 280,
          background: "radial-gradient(circle, rgba(255,79,18,0.13) 0%, transparent 70%)",
        }}
      />
      <p className="text-[26px] font-black tracking-tight text-[#111111]">Connected!</p>
      {serverUrl ? (
        <p className="mt-2 text-[13px] font-medium text-[#717171]">{serverUrl}</p>
      ) : null}
      <p className="mt-8 text-[12.5px] text-[#a0a0a0]">Taking you to your server…</p>
    </div>
  )
}

function Field({
  label,
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  right,
  mono,
  inputMode,
  maxLength,
  autoComplete,
}: {
  label: string
  icon: React.ElementType
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  right?: React.ReactNode
  mono?: boolean
  inputMode?: "text" | "email" | "numeric" | "decimal"
  maxLength?: number
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
        {label}
      </label>
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
        style={{ backgroundColor: "#f7f7f7", border: "1.5px solid #e8e8e8" }}
      >
        <Icon className="size-[16px] shrink-0 text-[#c0c0c0]" />
        <input
          type={type}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[#222222] outline-none placeholder-[#c0c0c0]"
          style={
            mono ? { fontFamily: "monospace", letterSpacing: "0.12em" } : undefined
          }
        />
        {right}
      </div>
    </div>
  )
}

function PasswordToggle({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 rounded-lg p-1 text-[#c0c0c0] transition-colors active:text-[#717171]"
      aria-label={visible ? "Hide password" : "Show password"}
    >
      {visible ? <EyeOff className="size-[16px]" /> : <Eye className="size-[16px]" />}
    </button>
  )
}

function OrangeButton({
  loading,
  label,
  loadingLabel,
  type = "submit",
  onClick,
  disabled,
}: {
  loading: boolean
  label: string
  loadingLabel: string
  type?: "submit" | "button"
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      className="flex h-[52px] w-full shrink-0 items-center justify-center rounded-2xl font-semibold text-white transition-opacity active:opacity-75 disabled:opacity-60"
      style={{
        background: "linear-gradient(135deg, #ff6a30 0%, #cc2e00 100%)",
        boxShadow: "0 4px 18px rgba(255,79,18,0.30)",
        fontSize: "15px",
      }}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="size-[17px] animate-spin rounded-full border-2 border-white/30 border-t-white" />
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  )
}

function GhostButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[46px] w-full shrink-0 items-center justify-center rounded-2xl text-[14px] font-medium text-[#717171] transition-colors active:bg-[#f0f0f0]"
      style={{ border: "1.5px solid #e8e8e8" }}
    >
      {label}
    </button>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      className="rounded-xl px-4 py-2.5 text-[12px] leading-relaxed text-[#b91c1c]"
      style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
      role="alert"
    >
      {message}
    </p>
  )
}


function SignInOptionsRow({
  rememberMe,
  onRememberMeChange,
  onForgotPassword,
}: {
  rememberMe: boolean
  onRememberMeChange: (value: boolean) => void
  onForgotPassword: () => void
}) {
  return (
    <div className="-mt-1 flex items-center justify-between gap-3">
      <label className="flex cursor-pointer items-center gap-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={rememberMe}
          aria-label="Remember me"
          onClick={() => onRememberMeChange(!rememberMe)}
          className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors"
          style={{
            borderColor: rememberMe ? "#ff4f12" : "#d4d4d4",
            backgroundColor: rememberMe ? "#ff4f12" : "#ffffff",
          }}
        >
          {rememberMe ? <Check className="size-3 stroke-[2.5] text-white" /> : null}
        </button>
        <span className="text-[12.5px] font-medium text-[#717171]">Remember me</span>
      </label>
      <button
        type="button"
        onClick={onForgotPassword}
        className="shrink-0 text-[12.5px] font-medium text-[#ff4f12] underline-offset-2 active:opacity-70"
      >
        Forgot password?
      </button>
    </div>
  )
}

type ServerAddressMode = "local" | "remote"

function ServerAddressModeToggle({
  mode,
  onChange,
}: {
  mode: ServerAddressMode
  onChange: (mode: ServerAddressMode) => void
}) {
  return (
    <div
      className="flex rounded-2xl p-1"
      style={{ backgroundColor: "#f7f7f7", border: "1.5px solid #e8e8e8" }}
      role="tablist"
      aria-label="How you reach your server"
    >
      {(
        [
          { id: "local" as const, label: "On my network" },
          { id: "remote" as const, label: "From anywhere" },
        ] as const
      ).map(({ id, label }) => {
        const active = mode === id
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className="flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold transition-colors"
            style={{
              backgroundColor: active ? "#ffffff" : "transparent",
              color: active ? "#111111" : "#a0a0a0",
              boxShadow: active ? "0 1px 4px rgba(0,0,0,0.06)" : undefined,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function SetupStepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
        Section {step} of 2
      </span>
      <div className="flex flex-1 gap-1.5">
        <div
          className="h-1 flex-1 rounded-full transition-colors"
          style={{ backgroundColor: step >= 1 ? "#ff4f12" : "#e8e8e8" }}
        />
        <div
          className="h-1 flex-1 rounded-full transition-colors"
          style={{ backgroundColor: step >= 2 ? "#ff4f12" : "#e8e8e8" }}
        />
      </div>
    </div>
  )
}

function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="mx-4 mt-3 mb-6 shrink-0">
      <div
        className="rounded-3xl bg-white px-6 pt-6 pb-6"
        style={{ border: "1px solid #efefef" }}
      >
        <div>
          <p
            className="text-[20px] font-bold tracking-tight text-[#111111]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            {title}
          </p>
          <p className="mt-0.5 text-[12.5px] text-[#a0a0a0]">{subtitle}</p>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          <div className="flex flex-col gap-3.5">{children}</div>
          <div>{footer}</div>
        </div>
      </div>
    </div>
  )
}


function CardDivider() {
  return (
    <div className="my-1 flex items-center gap-3">
      <div className="h-px flex-1 bg-[#f0f0f0]" />
      <span className="text-[11px] text-[#c0c0c0]">or</span>
      <div className="h-px flex-1 bg-[#f0f0f0]" />
    </div>
  )
}

export function SignInPage() {
  const router = useRouter()
  const { ready, connection, applyAuth } = useConnection()

  const [activePage, setActivePage] = useState(0)
  const [setupStep, setSetupStep] = useState<1 | 2>(1)
  const [showSuccess, setShowSuccess] = useState(false)
  const [connectedUrl, setConnectedUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  const [serverUrl, setServerUrl] = useState("")
  const [serverAddressMode, setServerAddressMode] = useState<ServerAddressMode>("local")
  const [pairingCode, setPairingCode] = useState("")
  const [setupEmail, setSetupEmail] = useState("")
  const [setupPassword, setSetupPassword] = useState("")
  const [showSetupPw, setShowSetupPw] = useState(false)
  const [setupBusy, setSetupBusy] = useState<"check" | "continue" | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [verifiedApiBase, setVerifiedApiBase] = useState<string | null>(null)
  const [verifiedInstanceName, setVerifiedInstanceName] = useState<string | null>(null)
  /** pair = new device (URL → Continue → 6-digit code). switch = change saved URL only. */
  const [setupMode, setSetupMode] = useState<"pair" | "switch">("pair")

  const serverProfile = loadServerProfile()
  const isPairingSetup = setupMode === "pair"

  function goToPage(page: 0 | 1, mode?: "pair" | "switch") {
    setActivePage(page)
    setError(null)
    if (page === 1) {
      setSetupMode(mode ?? (hasStoredServer() ? "switch" : "pair"))
      setSetupStep(1)
      setServerUrl("")
      setServerAddressMode("local")
      setVerifiedApiBase(null)
      setVerifiedInstanceName(null)
    }
  }

  useEffect(() => {
    if (!ready) return
    if (connection) {
      router.replace("/home")
    }
  }, [ready, connection, router])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const server = loadServerProfile()
    if (!server?.apiBaseUrl) {
      setError("Connect to your server first, then sign in with your email and password.")
      goToPage(1)
      return
    }

    setSigningIn(true)
    try {
      const auth = await loginMobileDevice(
        { apiBaseUrl: server.apiBaseUrl },
        { email, password, deviceName: detectDeviceName() },
      )
      applyAuth(auth, server.apiBaseUrl)
      const labelBase = authWithClientApiBase(auth, server.apiBaseUrl).server.apiBaseUrl
      setConnectedUrl(displayServerLabel(labelBase, auth.server.instanceName))
      setShowSuccess(true)
      setTimeout(() => router.push("/home"), 2200)
    } catch (err) {
      setError(formatApiError(err, serverProfile?.apiBaseUrl ?? serverProfile?.webUrl))
    } finally {
      setSigningIn(false)
    }
  }

  async function handleVerifyServer() {
    setError(null)
    setSetupBusy("check")
    setVerifiedApiBase(null)
    setVerifiedInstanceName(null)
    try {
      const { discover, apiBaseUrl } = await discoverServer(serverUrl)
      setVerifiedApiBase(apiBaseUrl)
      setVerifiedInstanceName(discover.instanceName)
      const clientUrls = deriveMobileServerUrlsFromApiBase(apiBaseUrl)
      saveServerProfile({
        ...clientUrls,
        instanceName: discover.instanceName,
      })
    } catch (err) {
      setError(formatApiError(err, serverUrl))
    } finally {
      setSetupBusy(null)
    }
  }

  async function saveVerifiedServerAndFinishSetup(apiBase: string, instanceName: string) {
    const clientUrls = deriveMobileServerUrlsFromApiBase(apiBase)
    saveServerProfile({
      ...clientUrls,
      instanceName,
    })
    if (setupMode === "switch") {
      setError(null)
      goToPage(0)
      return true
    }
    return false
  }

  async function handleContinueSetup() {
    setError(null)
    if (!serverUrl.trim()) {
      setError("Enter your server address.")
      return
    }
    if (!verifiedApiBase) {
      setSetupBusy("continue")
      try {
        const { discover, apiBaseUrl } = await discoverServer(serverUrl)
        setVerifiedApiBase(apiBaseUrl)
        setVerifiedInstanceName(discover.instanceName)
        const finished = await saveVerifiedServerAndFinishSetup(
          apiBaseUrl,
          discover.instanceName,
        )
        if (!finished) setSetupStep(2)
      } catch (err) {
        setError(formatApiError(err, serverUrl))
      } finally {
        setSetupBusy(null)
      }
      return
    }
    const finished = await saveVerifiedServerAndFinishSetup(
      verifiedApiBase,
      verifiedInstanceName ?? "Arciin",
    )
    if (!finished) setSetupStep(2)
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!pairingCode.replace(/\D/g, "").match(/^\d{6}$/)) {
      setError("Enter the 6-digit connection code from your server.")
      return
    }

    setConnecting(true)
    try {
      let apiBase = verifiedApiBase
      let instanceName = verifiedInstanceName
      if (!apiBase || isLoopbackApiBase(apiBase)) {
        const discovered = await discoverServer(serverUrl)
        apiBase = discovered.apiBaseUrl
        instanceName = discovered.discover.instanceName
        setVerifiedApiBase(apiBase)
        setVerifiedInstanceName(instanceName)
      }

      const auth = await pairMobileDevice(apiBase, {
        code: pairingCode,
        email: setupEmail,
        password: setupPassword,
        deviceName: detectDeviceName(),
      })

      applyAuth(auth, apiBase)
      setConnectedUrl(
        displayServerLabel(
          authWithClientApiBase(auth, apiBase).server.apiBaseUrl,
          auth.server.instanceName ?? instanceName ?? "Arciin",
        ),
      )
      setShowSuccess(true)
      setTimeout(() => router.push("/home"), 2200)
    } catch (err) {
      setError(formatApiError(err, serverUrl.trim() || verifiedApiBase))
    } finally {
      setConnecting(false)
    }
  }

  function handleServerUrlChange(value: string) {
    setServerUrl(value)
    setVerifiedApiBase(null)
    setVerifiedInstanceName(null)
    const trimmed = value.trim()
    if (/^https:\/\//i.test(trimmed) || (trimmed && isPublicServerAddress(trimmed))) {
      setServerAddressMode("remote")
    } else if (/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(trimmed)) {
      setServerAddressMode("local")
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f7f7]">
        <span className="size-8 animate-spin rounded-full border-2 border-[#ff4f12]/30 border-t-[#ff4f12]" />
      </div>
    )
  }

  if (showSuccess) return <SuccessScreen serverUrl={connectedUrl} />

  return (
    <div
      className="flex min-h-[100dvh] flex-col pt-safe pb-safe"
      style={{ backgroundColor: "#f7f7f7" }}
    >
      <BrandHeroCarousel
        activePage={activePage as 0 | 1}
        onSelectPage={(p) => goToPage(p, p === 1 ? "pair" : undefined)}
      />

      {activePage === 0 ? (
        <AuthCard
          title="Welcome back"
          subtitle={
            serverProfile?.apiBaseUrl
              ? "Sign in to your Arciin server"
              : "Sign in after you connect this device to your server"
          }
          footer={
            <>
              <CardDivider />
              <div className="flex flex-col gap-2">
                <GhostButton
                  label={hasStoredServer() ? "Change server" : "Connect to a server"}
                  onClick={() => goToPage(1, hasStoredServer() ? "switch" : "pair")}
                />
                {hasStoredServer() ? (
                  <GhostButton
                    label="Connect to a new server"
                    onClick={() => goToPage(1, "pair")}
                  />
                ) : null}
              </div>
            </>
          }
        >
          <form onSubmit={handleSignIn} className="flex flex-col gap-3.5">
            {serverProfile?.apiBaseUrl ? (
              <LoginDomainChip
                apiBaseUrl={serverProfile.apiBaseUrl}
                webUrl={serverProfile.webUrl}
              />
            ) : null}
            {serverProfile && isLoopbackApiBase(serverProfile.apiBaseUrl) ? (
              <p
                className="rounded-xl px-3 py-2 text-[12px] leading-relaxed text-[#b45309]"
                style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}
                role="alert"
              >
                This device saved <strong>localhost</strong>, which does not work on your
                iPhone. Tap <strong>Change server</strong> and enter a LAN IP (e.g. 192.168.1.10)
                or a public URL if you use a tunnel or domain.
              </p>
            ) : null}
            {error ? <ErrorBanner message={error} /> : null}
            <Field
              label="Email"
              icon={Mail}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Field
              label="Password"
              icon={Lock}
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              right={
                <PasswordToggle visible={showPw} onToggle={() => setShowPw((p) => !p)} />
              }
            />
            <SignInOptionsRow
              rememberMe={rememberMe}
              onRememberMeChange={setRememberMe}
              onForgotPassword={() => router.push("/sign-in/forgot-password")}
            />
            <p className="text-[11.5px] leading-relaxed text-[#a0a0a0]">
              {hasStoredServer()
                ? "No connection code needed — use your email and password. Change the server address below if you switched to a public URL."
                : "First time on this phone? Tap Connect to a server and use the 6-digit code from your computer."}
            </p>
            <OrangeButton loading={signingIn} label="Sign in" loadingLabel="Signing in…" />
          </form>
        </AuthCard>
      ) : (
        <AuthCard
          title={
            setupStep === 1
              ? isPairingSetup
                ? "Connect a server"
                : "Change server"
              : "Pair this device"
          }
          subtitle={
            setupStep === 1
              ? serverAddressMode === "remote"
                ? "Paste your public URL or tunnel link — works from cellular, not only Wi‑Fi"
                : "Enter your server’s LAN IP while on the same Wi‑Fi"
              : verifiedInstanceName
                ? `Link to ${verifiedInstanceName}`
                : "Connection code and your account"
          }
          footer={
            <>
              <CardDivider />
              <GhostButton label="Back to sign in" onClick={() => goToPage(0)} />
            </>
          }
        >
          {isPairingSetup ? <SetupStepIndicator step={setupStep} /> : null}

          {setupStep === 1 ? (
            <div className="flex flex-col gap-3.5">
              {error ? <ErrorBanner message={error} /> : null}
              <ServerAddressModeToggle
                mode={serverAddressMode}
                onChange={(mode) => {
                  setServerAddressMode(mode)
                  setError(null)
                }}
              />
              <Field
                label={serverAddressMode === "remote" ? "Domain" : "Server IP address"}
                icon={Globe}
                placeholder={
                  serverAddressMode === "remote"
                    ? "https://your-domain.com"
                    : "192.168.1.100"
                }
                value={serverUrl}
                onChange={handleServerUrlChange}
                autoComplete="url"
              />
              <p className="-mt-1 text-[11.5px] leading-relaxed text-[#a0a0a0]">
                {serverAddressMode === "remote"
                  ? "Use a domain, reverse proxy, or generated tunnel URL from Arciin settings. You do not need to be on the same network."
                  : "Find this in Arciin on your computer, or use your router’s device list. Phone and server must share Wi‑Fi."}
              </p>
              <OrangeButton
                type="button"
                loading={setupBusy === "check"}
                label="Check server"
                loadingLabel="Checking…"
                onClick={handleVerifyServer}
                disabled={setupBusy !== null}
              />
              {verifiedInstanceName ? (
                <p
                  className="rounded-xl px-4 py-2.5 text-[12px] font-medium text-[#15803d]"
                  style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
                >
                  Found: {verifiedInstanceName}
                </p>
              ) : null}
              <OrangeButton
                type="button"
                loading={setupBusy === "continue"}
                label={isPairingSetup ? "Continue" : "Save & sign in"}
                loadingLabel={isPairingSetup ? "Continuing…" : "Saving…"}
                onClick={handleContinueSetup}
                disabled={!serverUrl.trim() || setupBusy !== null}
              />
            </div>
          ) : (
            <form onSubmit={handleConnect} className="flex flex-col gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setSetupStep(1)
                  setError(null)
                }}
                className="flex w-fit items-center gap-1 text-[13px] font-medium text-[#717171] active:text-[#111111]"
              >
                <ChevronLeft className="size-4" />
                Back to server
              </button>
              {error ? <ErrorBanner message={error} /> : null}
              <Field
                label="Connection code"
                icon={Key}
                placeholder="6-digit code"
                value={pairingCode}
                onChange={(v) => setPairingCode(v.replace(/\D/g, "").slice(0, 6))}
                mono
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
              />
              <Field
                label="Email"
                icon={Mail}
                type="email"
                placeholder="your Arciin email"
                value={setupEmail}
                onChange={setSetupEmail}
                autoComplete="email"
              />
              <Field
                label="Password"
                icon={Lock}
                type={showSetupPw ? "text" : "password"}
                placeholder="••••••••"
                value={setupPassword}
                onChange={setSetupPassword}
                autoComplete="current-password"
                right={
                  <PasswordToggle
                    visible={showSetupPw}
                    onToggle={() => setShowSetupPw((p) => !p)}
                  />
                }
              />
              <OrangeButton
                loading={connecting}
                label="Connect device"
                loadingLabel="Connecting…"
              />
            </form>
          )}
        </AuthCard>
      )}
    </div>
  )
}

function detectDeviceName(): string {
  if (typeof navigator === "undefined") return "Mobile"
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return "iPhone"
  if (/iPad/i.test(ua)) return "iPad"
  if (/Android/i.test(ua)) return "Android"
  return "Mobile"
}
