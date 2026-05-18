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
} from "@/lib/connection/normalize-url"
import { hasStoredConnection, loadConnection } from "@/lib/connection/storage"
import { BrandHeroCarousel } from "@/components/auth/brand-hero"
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
  const [pairingCode, setPairingCode] = useState("")
  const [setupEmail, setSetupEmail] = useState("")
  const [setupPassword, setSetupPassword] = useState("")
  const [showSetupPw, setShowSetupPw] = useState(false)
  const [verifyingServer, setVerifyingServer] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [verifiedApiBase, setVerifiedApiBase] = useState<string | null>(null)
  const [verifiedInstanceName, setVerifiedInstanceName] = useState<string | null>(null)

  const stored = loadConnection()
  const serverLabel = stored
    ? displayServerLabel(stored.apiBaseUrl, stored.instanceName)
    : null

  function goToPage(page: 0 | 1) {
    setActivePage(page)
    setError(null)
    if (page === 1) setSetupStep(1)
  }

  useEffect(() => {
    if (!ready) return
    if (connection) {
      router.replace("/home")
    }
  }, [ready, connection, router])

  useEffect(() => {
    if (!ready) return
    if (!hasStoredConnection()) {
      setActivePage(1)
    }
  }, [ready])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const conn = loadConnection()
    if (!conn?.apiBaseUrl) {
      setError("Set up this device first to connect to your server.")
      goToPage(1)
      return
    }

    setSigningIn(true)
    try {
      const auth = await loginMobileDevice(
        { apiBaseUrl: conn.apiBaseUrl },
        { email, password, deviceName: detectDeviceName() },
      )
      applyAuth(auth)
      setConnectedUrl(displayServerLabel(auth.server.apiBaseUrl, auth.server.instanceName))
      setShowSuccess(true)
      setTimeout(() => router.push("/home"), 2200)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSigningIn(false)
    }
  }

  async function handleVerifyServer() {
    setError(null)
    setVerifyingServer(true)
    setVerifiedApiBase(null)
    setVerifiedInstanceName(null)
    try {
      const { discover, apiBaseUrl } = await discoverServer(serverUrl)
      setVerifiedApiBase(apiBaseUrl)
      setVerifiedInstanceName(discover.instanceName)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setVerifyingServer(false)
    }
  }

  async function handleContinueSetup() {
    setError(null)
    if (!serverUrl.trim()) {
      setError("Enter your server address.")
      return
    }
    if (!verifiedApiBase) {
      setVerifyingServer(true)
      try {
        const { discover, apiBaseUrl } = await discoverServer(serverUrl)
        setVerifiedApiBase(apiBaseUrl)
        setVerifiedInstanceName(discover.instanceName)
        setSetupStep(2)
      } catch (err) {
        setError(formatApiError(err))
      } finally {
        setVerifyingServer(false)
      }
      return
    }
    setSetupStep(2)
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

      const clientUrls = deriveMobileServerUrlsFromApiBase(apiBase)
      applyAuth({
        ...auth,
        server: {
          ...auth.server,
          ...clientUrls,
          instanceName: auth.server.instanceName ?? instanceName ?? "Arciin",
        },
      })
      setConnectedUrl(displayServerLabel(auth.server.apiBaseUrl, auth.server.instanceName))
      setShowSuccess(true)
      setTimeout(() => router.push("/home"), 2200)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setConnecting(false)
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
      <BrandHeroCarousel activePage={activePage as 0 | 1} onSelectPage={goToPage} />

      {activePage === 0 ? (
        <AuthCard
          title="Welcome back"
          subtitle={
            serverLabel
              ? `Sign in to ${serverLabel}`
              : "Sign in after you connect this device to your server"
          }
          footer={
            <>
              <CardDivider />
              <GhostButton label="Set up a new device" onClick={() => goToPage(1)} />
            </>
          }
        >
          <form onSubmit={handleSignIn} className="flex flex-col gap-3.5">
            {serverLabel ? (
              <p
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-[#717171]"
                style={{ backgroundColor: "#f7f7f7", border: "1px solid #efefef" }}
              >
                <Server className="size-3.5 shrink-0 text-[#ff4f12]" />
                {serverLabel}
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
            <OrangeButton loading={signingIn} label="Sign in" loadingLabel="Signing in…" />
          </form>
        </AuthCard>
      ) : (
        <AuthCard
          title={setupStep === 1 ? "Connect a server" : "Pair this device"}
          subtitle={
            setupStep === 1
              ? "Enter your Arciin server address on your network"
              : verifiedInstanceName
                ? `Link to ${verifiedInstanceName}`
                : "Connection code and your account"
          }
          footer={
            <>
              <CardDivider />
              <GhostButton
                label="Already connected? Sign in"
                onClick={() => goToPage(0)}
              />
            </>
          }
        >
          <SetupStepIndicator step={setupStep} />

          {setupStep === 1 ? (
            <div className="flex flex-col gap-3.5">
              {error ? <ErrorBanner message={error} /> : null}
              <Field
                label="Server address"
                icon={Globe}
                placeholder="192.168.1.100"
                value={serverUrl}
                onChange={(v) => {
                  setServerUrl(v)
                  setVerifiedApiBase(null)
                  setVerifiedInstanceName(null)
                }}
                autoComplete="url"
              />
              <OrangeButton
                type="button"
                loading={verifyingServer}
                label="Check server"
                loadingLabel="Checking…"
                onClick={handleVerifyServer}
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
                loading={verifyingServer}
                label="Continue"
                loadingLabel="Checking…"
                onClick={handleContinueSetup}
                disabled={!serverUrl.trim()}
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
