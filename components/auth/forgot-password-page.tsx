"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, HelpCircle, Lock, Mail } from "lucide-react"

import { AuthMobileCardHeader } from "@/components/auth/auth-mobile-shell"
import { AuthMobileField, AuthMobileFormMessage } from "@/components/auth/auth-mobile-field"
import {
  hasFieldErrors,
  mapRecoveryApiError,
  validateForgotPasswordEmail,
  validateForgotPasswordReset,
  type AuthFieldErrors,
} from "@/lib/auth/form-validation"
import { lookupPasswordRecovery, resetPasswordWithRecovery } from "@/lib/api/recovery"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import {
  getCachedStandaloneInstanceGate,
  loadStandaloneInstanceGate,
} from "@/lib/standalone/instance-gate"

const primaryButtonClass = "auth-primary-button"

function BackToSignInLink() {
  return (
    <p className="mt-auto pt-2 text-center">
      <Link
        href="/sign-in"
        prefetch
        className="text-[12.5px] font-medium text-[#717171] underline-offset-2 active:text-[#444444] hover:underline"
      >
        Back to sign in
      </Link>
    </p>
  )
}

export function ForgotPasswordPage() {
  const apiBase = getStandaloneApiBaseUrl()
  const cachedGate = getCachedStandaloneInstanceGate()

  const [instanceName, setInstanceName] = useState<string | null>(
    cachedGate?.status?.instanceName ?? null,
  )
  const [step, setStep] = useState<"email" | "reset" | "done">("email")
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [recoveryUnavailable, setRecoveryUnavailable] = useState(false)

  useEffect(() => {
    if (cachedGate?.status?.instanceName) return
    let cancelled = false
    void (async () => {
      const gate = await loadStandaloneInstanceGate()
      if (cancelled) return
      if (gate.status?.instanceName) {
        setInstanceName(gate.status.instanceName)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cachedGate?.status?.instanceName])

  const name = instanceName ?? "your Arciin"

  const pageTitle =
    step === "done" ? "Password updated" : step === "reset" ? "Reset password" : "Forgot password"

  const pageSubtitle =
    step === "done"
      ? `Your ${name} password was updated. Sign in with your new password on this device.`
      : step === "reset"
        ? `Answer the security question you chose during ${name} setup, then choose a new password.`
        : `Reset your ${name} password using the email and security question from setup — no email reset links.`

  function clearFieldError(key: keyof AuthFieldErrors) {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    setFormError(null)
    setRecoveryUnavailable(false)
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setFormError(null)
    setRecoveryUnavailable(false)

    const validation = validateForgotPasswordEmail(email)
    if (hasFieldErrors(validation)) {
      setFieldErrors(validation)
      return
    }

    setBusy(true)
    try {
      const result = await lookupPasswordRecovery(email.trim().toLowerCase())
      if (!result.available || !result.question) {
        setRecoveryUnavailable(true)
        return
      }
      setQuestion(result.question)
      setStep("reset")
    } catch (err) {
      const mapped = mapRecoveryApiError(err, apiBase)
      setFieldErrors(mapped.fields)
      if (mapped.form) setFormError(mapped.form)
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setFormError(null)

    const validation = validateForgotPasswordReset(answer, newPassword, confirmPassword)
    if (hasFieldErrors(validation)) {
      setFieldErrors(validation)
      return
    }

    setBusy(true)
    try {
      await resetPasswordWithRecovery({
        email: email.trim().toLowerCase(),
        answer,
        newPassword,
      })
      setStep("done")
    } catch (err) {
      const mapped = mapRecoveryApiError(err, apiBase)
      setFieldErrors(mapped.fields)
      if (mapped.form) setFormError(mapped.form)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <AuthMobileCardHeader title={pageTitle} subtitle={pageSubtitle} />

      {step === "email" ? (
        <form onSubmit={handleLookup} className="mt-5 flex flex-1 flex-col gap-3.5">
          {recoveryUnavailable ? (
            <AuthMobileFormMessage
              tone="info"
              message="No security question on that account. Add one under Profile → Password after signing in."
            />
          ) : null}
          <AuthMobileField
            id="forgot-email"
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
          <AuthMobileFormMessage message={formError} />
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? "Checking…" : "Continue"}
          </button>
          <BackToSignInLink />
        </form>
      ) : null}

      {step === "reset" ? (
        <form onSubmit={handleReset} className="mt-5 flex flex-1 flex-col gap-3">
          <div className="rounded-2xl border border-[#e8e8e8] bg-[#fafafa] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
              Security question
            </p>
            <p className="mt-1 text-[13px] leading-snug text-[#222222]">{question}</p>
          </div>
          <AuthMobileField
            id="forgot-answer"
            label="Your answer"
            icon={HelpCircle}
            type="text"
            placeholder="Answer from setup"
            value={answer}
            onChange={(value) => {
              setAnswer(value)
              clearFieldError("answer")
            }}
            autoComplete="off"
            error={fieldErrors.answer}
          />
          <AuthMobileField
            id="forgot-new-password"
            label="New password"
            icon={Lock}
            type={showPw ? "text" : "password"}
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(value) => {
              setNewPassword(value)
              clearFieldError("newPassword")
            }}
            autoComplete="new-password"
            error={fieldErrors.newPassword}
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
          <AuthMobileField
            id="forgot-confirm-password"
            label="Confirm password"
            icon={Lock}
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value)
              clearFieldError("confirmPassword")
            }}
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
          />
          <AuthMobileFormMessage message={formError} />
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? "Updating…" : "Reset password"}
          </button>
          <BackToSignInLink />
        </form>
      ) : null}

      {step === "done" ? (
        <div className="mt-5 flex flex-1 flex-col gap-3.5">
          <Link href="/sign-in" prefetch className={primaryButtonClass}>
            Sign in
          </Link>
          <BackToSignInLink />
        </div>
      ) : null}
    </>
  )
}
