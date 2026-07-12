"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, Eye, EyeOff, Lock, Mail } from "lucide-react"

import { ConnectionSuccessScreen } from "@/components/auth/connection-success-screen"
import { AuthMobileCardHeader } from "@/components/auth/auth-mobile-shell"
import { AuthMobileField, AuthMobileFormMessage } from "@/components/auth/auth-mobile-field"
import {
  hasFieldErrors,
  mapSignInApiError,
  validateSignIn,
  type AuthFieldErrors,
} from "@/lib/auth/form-validation"
import { loginMobileDevice } from "@/lib/api/mobile"
import { authWithClientApiBase } from "@/lib/connection/merge-auth"
import { displayServerLabel } from "@/lib/connection/normalize-url"
import { loadServerProfile } from "@/lib/connection/storage"
import { useConnection } from "@/components/providers/connection-provider"

function detectDeviceName() {
  if (typeof navigator === "undefined") return "Mobile"
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone"
  if (/Android/i.test(ua)) return "Android"
  return "Mobile"
}

export function SignInPage() {
  const router = useRouter()
  const { ready, connection, applyAuth } = useConnection()

  const [booting, setBooting] = useState(true)
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [connectedUrl, setConnectedUrl] = useState("")
  const [connectedInstance, setConnectedInstance] = useState("Arciin")
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!ready) return
    if (connection) {
      router.replace("/home")
      return
    }

    const profile = loadServerProfile()
    if (!profile) {
      router.replace("/connect")
      return
    }

    setInstanceName(profile.instanceName ?? "Arciin")
    setBooting(false)
  }, [ready, connection, router])

  function clearFieldError(key: keyof AuthFieldErrors) {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    setFormError(null)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setFormError(null)

    const validation = validateSignIn(email, password)
    if (hasFieldErrors(validation)) {
      setFieldErrors(validation)
      return
    }

    const profile = loadServerProfile()
    if (!profile) {
      router.replace("/connect")
      return
    }

    const apiBase = profile.apiBaseUrl
    setSigningIn(true)
    try {
      const auth = await loginMobileDevice(
        { apiBaseUrl: apiBase },
        { email, password, deviceName: detectDeviceName() },
      )
      applyAuth(auth, apiBase)
      const labelBase = authWithClientApiBase(auth, apiBase).server.apiBaseUrl
      setConnectedInstance(auth.server.instanceName ?? instanceName ?? "Arciin")
      setConnectedUrl(displayServerLabel(labelBase, auth.server.instanceName))
      setShowSuccess(true)
    } catch (err) {
      const mapped = mapSignInApiError(err, apiBase)
      setFieldErrors(mapped.fields)
      if (mapped.form) setFormError(mapped.form)
    } finally {
      setSigningIn(false)
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

  if (!ready || booting) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <span className="size-8 animate-spin rounded-full border-2 border-[#ff4f12]/30 border-t-[#ff4f12]" />
      </div>
    )
  }

  const name = instanceName ?? "your Arciin"

  return (
    <>
      <AuthMobileCardHeader
        title="Sign in"
        subtitle={`Sign in to ${name} with the email and password from your Arciin server.`}
      />

      <form onSubmit={handleSignIn} className="mt-5 flex flex-1 flex-col gap-3.5">
        <AuthMobileField
          id="sign-in-email"
          label="Email"
          icon={Mail}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(value) => {
            setEmail(value)
            clearFieldError("email")
          }}
          autoComplete="email"
          error={fieldErrors.email}
        />
        <AuthMobileField
          id="sign-in-password"
          label="Password"
          icon={Lock}
          type={showPw ? "text" : "password"}
          placeholder="Your password"
          value={password}
          onChange={(value) => {
            setPassword(value)
            clearFieldError("password")
          }}
          autoComplete="current-password"
          error={fieldErrors.password}
          right={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="text-[#c0c0c0]"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          }
        />
        <div className="-mt-1 flex items-center justify-between gap-3">
          <label htmlFor="sign-in-remember" className="flex cursor-pointer items-center gap-2.5">
            <button
              id="sign-in-remember"
              type="button"
              role="checkbox"
              aria-checked={rememberMe}
              onClick={() => setRememberMe((v) => !v)}
              className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border"
              style={{
                borderColor: rememberMe ? "#ff4f12" : "#d4d4d4",
                backgroundColor: rememberMe ? "#ff4f12" : "#ffffff",
              }}
            >
              {rememberMe ? <Check className="size-3 stroke-[2.5] text-white" /> : null}
            </button>
            <span className="text-[12.5px] font-medium text-[#717171]">Remember me</span>
          </label>
          <Link
            href="/sign-in/forgot-password"
            prefetch
            className="text-[12.5px] font-medium text-[#ff4f12] active:opacity-70"
          >
            Forgot password?
          </Link>
        </div>

        <AuthMobileFormMessage message={formError} />

        <button type="submit" disabled={signingIn} className="auth-primary-button">
          {signingIn ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-[12.5px] text-[#717171]">
          <Link href="/connect" prefetch className="font-medium text-[#ff4f12] underline-offset-2 hover:underline">
            Use a different server
          </Link>
        </p>

        <p className="mt-auto pt-2 text-center">
          <Link
            href="/install"
            prefetch
            className="text-[12.5px] font-medium text-[#717171] underline-offset-2 active:text-[#444444] hover:underline"
          >
            Install Arciin Mobile on this device
          </Link>
        </p>
      </form>
    </>
  )
}
