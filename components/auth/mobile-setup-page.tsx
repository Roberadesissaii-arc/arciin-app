"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  Eye,
  EyeOff,
  HardDrive,
  HelpCircle,
  Key,
  Lock,
  Mail,
  Server,
  Sparkles,
  User,
} from "lucide-react"

import { claimInstance, getInstanceStatus } from "@/lib/api/instance"
import { getStorageDiscovery, prepareStoragePath } from "@/lib/api/instance-storage"
import { formatApiError } from "@/lib/api/errors"
import { loginMobileDevice } from "@/lib/api/mobile"
import { ConnectionSuccessScreen } from "@/components/auth/connection-success-screen"
import {
  AuthMobileCardHeader,
  AuthMobileShell,
} from "@/components/auth/auth-mobile-shell"
import { AuthMobileField, AuthMobileFormMessage } from "@/components/auth/auth-mobile-field"
import { SetupLegalAcceptance } from "@/components/auth/setup-legal-acceptance"
import { useConnection } from "@/components/providers/connection-provider"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import {
  defaultStorageRootForSetup,
  isFirstRunSetupContext,
  markStandaloneSetupComplete,
} from "@/lib/standalone/first-run"
import { loadStandaloneInstanceGate } from "@/lib/standalone/instance-gate"
import {
  fetchInstallSetupTokenPrefill,
  setupTokenFromUrl,
} from "@/lib/standalone/setup-token-prefill"
import { authWithClientApiBase } from "@/lib/connection/merge-auth"
import { displayServerLabel } from "@/lib/connection/normalize-url"
import { SETUP_LIBRARY_OPTIONS, setupLibraryMeta } from "@/lib/setup/library-meta"

type SetupStep = "server" | "account" | "security" | "libraries"

const SETUP_STEPS: SetupStep[] = ["server", "account", "security", "libraries"]

const PRIMARY_BUTTON_CLASS = "auth-primary-button"

const TERMS_ERROR =
  "You must read and agree to the Terms of Use and Privacy Policy before claiming this instance."

const STEP_META: Record<
  SetupStep,
  { title: string; subtitle: string; label: string }
> = {
  server: {
    title: "Set up Arciin",
    label: "Server",
    subtitle: "Enter your setup token and choose where files are stored.",
  },
  account: {
    title: "Create account",
    label: "Account",
    subtitle: "Your admin name, email, and password for sign-in.",
  },
  security: {
    title: "Password recovery",
    label: "Recovery",
    subtitle: "Optional — set a security question or skip for now.",
  },
  libraries: {
    title: "Choose libraries",
    label: "Libraries",
    subtitle: "Pick the default libraries — you can add more later.",
  },
}

function SetupStepChrome({ step }: { step: SetupStep }) {
  const index = stepIndex(step)
  return (
    <div className="mt-3 flex gap-1.5">
      {SETUP_STEPS.map((s, i) => (
        <div
          key={s}
          className="h-1 flex-1 rounded-full"
          style={{ backgroundColor: i <= index ? "#ff4f12" : "#e8e8e8" }}
          aria-hidden
        />
      ))}
    </div>
  )
}

function stepIndex(step: SetupStep): number {
  return SETUP_STEPS.indexOf(step)
}

function previousStep(step: SetupStep): SetupStep | null {
  const i = stepIndex(step)
  return i > 0 ? SETUP_STEPS[i - 1]! : null
}

function detectDeviceName() {
  if (typeof navigator === "undefined") return "Mobile"
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone"
  if (/Android/i.test(ua)) return "Android"
  return "Mobile"
}

export function MobileSetupPage() {
  const router = useRouter()
  const { applyAuth } = useConnection()

  const [step, setStep] = useState<SetupStep>("server")
  const [loading, setLoading] = useState(true)
  const [alreadyInitialized, setAlreadyInitialized] = useState(false)
  const [existingInstanceName, setExistingInstanceName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [connectedInstance, setConnectedInstance] = useState("Arciin")
  const [connectedUrl, setConnectedUrl] = useState("")

  const [setupToken, setSetupToken] = useState("")
  const [instanceName, setInstanceName] = useState("Local Instance")
  const [storageRoot, setStorageRoot] = useState(defaultStorageRootForSetup)
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [recoveryQuestion, setRecoveryQuestion] = useState("")
  const [recoveryAnswer, setRecoveryAnswer] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [libraries, setLibraries] = useState<string[]>([...SETUP_LIBRARY_OPTIONS])
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const gate = await loadStandaloneInstanceGate({ refresh: true })
      if (cancelled) return

      if (gate.instanceReady) {
        setAlreadyInitialized(true)
        setExistingInstanceName(gate.status?.instanceName ?? "Arciin")
        setLoading(false)
        return
      }

      if (gate.error && !isFirstRunSetupContext(gate)) {
        setError(gate.error)
        setLoading(false)
        return
      }

      let status = gate.status
      if (!status) {
        try {
          status = await getInstanceStatus()
        } catch {
          /* API still starting on first boot */
        }
      }

      if (status?.suggestedStorageRoot) {
        setStorageRoot(status.suggestedStorageRoot)
      } else {
        setStorageRoot((prev) => prev.trim() || defaultStorageRootForSetup())
      }
      try {
        const discovery = await getStorageDiscovery()
        if (!cancelled && discovery.recommendedArciinPath) {
          setStorageRoot(discovery.recommendedArciinPath)
        }
      } catch {
        /* first-run: API may still be starting — keep default path */
      }

      if (!cancelled) {
        const fromUrl = setupTokenFromUrl()
        if (fromUrl) {
          setSetupToken(fromUrl)
        } else if (status?.setupTokenPrefill) {
          setSetupToken(status.setupTokenPrefill)
        } else {
          const fromInstall = await fetchInstallSetupTokenPrefill()
          if (!cancelled && fromInstall) setSetupToken(fromInstall)
        }
      }

      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  function toggleLibrary(name: string) {
    setLibraries((prev) =>
      prev.includes(name) ? prev.filter((l) => l !== name) : [...prev, name],
    )
  }

  function validateRecoveryFields(): string | null {
    const hasQuestion = Boolean(recoveryQuestion.trim())
    const hasAnswer = Boolean(recoveryAnswer.trim())
    if (hasQuestion !== hasAnswer) {
      return "Add both a security question and answer, or leave both empty."
    }
    if (hasQuestion && recoveryQuestion.trim().length < 4) {
      return "Security question must be at least 4 characters."
    }
    if (hasAnswer && recoveryAnswer.trim().length < 2) {
      return "Security answer must be at least 2 characters."
    }
    return null
  }

  async function handleContinueServer(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!setupToken.trim()) {
      setError("Setup token is required.")
      return
    }
    if (instanceName.trim().length < 2) {
      setError("Instance name must be at least 2 characters.")
      return
    }
    if (!storageRoot.trim()) {
      setError("Storage root is required.")
      return
    }

    setBusy(true)
    try {
      await prepareStoragePath(storageRoot.trim())
      setStep("account")
    } catch {
      setStep("account")
    } finally {
      setBusy(false)
    }
  }

  function handleContinueAccount(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (adminName.trim().length < 2) {
      setError("Admin name must be at least 2 characters.")
      return
    }
    if (!adminEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      setError("Enter a valid admin email.")
      return
    }
    if (adminPassword.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (confirmPassword.length < 8) {
      setError("Confirm the password.")
      return
    }
    if (adminPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setStep("security")
  }

  function handleContinueSecurity(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const recoveryError = validateRecoveryFields()
    if (recoveryError) {
      setError(recoveryError)
      return
    }
    setStep("libraries")
  }

  function handleSkipSecurity() {
    setError(null)
    setRecoveryQuestion("")
    setRecoveryAnswer("")
    setStep("libraries")
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setTermsError(null)
    if (libraries.length === 0) {
      setError("Select at least one library.")
      return
    }
    if (!acceptedTerms) {
      setTermsError(TERMS_ERROR)
      return
    }

    setBusy(true)
    const apiBase = getStandaloneApiBaseUrl()
    try {
      await claimInstance({
        setupToken: setupToken.trim(),
        instanceName: instanceName.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminPassword,
        storageRoot: storageRoot.trim(),
        libraries,
        acceptedTermsAndPrivacy: true,
        ...(recoveryQuestion.trim() && recoveryAnswer.trim()
          ? {
              recoveryQuestion: recoveryQuestion.trim(),
              recoveryAnswer: recoveryAnswer.trim(),
            }
          : {}),
      })

      const auth = await loginMobileDevice(
        { apiBaseUrl: apiBase },
        {
          email: adminEmail.trim().toLowerCase(),
          password: adminPassword,
          deviceName: detectDeviceName(),
        },
      )

      markStandaloneSetupComplete()
      applyAuth(auth, apiBase)
      const labelBase = authWithClientApiBase(auth, apiBase).server.apiBaseUrl
      setConnectedInstance(auth.server.instanceName ?? instanceName)
      setConnectedUrl(displayServerLabel(labelBase, auth.server.instanceName))
      setShowSuccess(true)
    } catch (err) {
      setError(formatApiError(err, apiBase))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <AuthMobileShell heroPage={1}>
        <div className="flex flex-1 items-center justify-center py-16">
          <span className="size-8 animate-spin rounded-full border-2 border-[#ff4f12]/30 border-t-[#ff4f12]" />
        </div>
      </AuthMobileShell>
    )
  }

  if (alreadyInitialized) {
    return (
      <AuthMobileShell heroPage={1} compact>
        <AuthMobileCardHeader
          title="Already set up"
          subtitle={`${existingInstanceName ?? "Arciin"} is configured — sign in with your admin account.`}
        />
        <p className="mt-4 text-center text-[12.5px] leading-relaxed text-[#717171]">
          First-run setup only runs once on this server.
        </p>
        <button
          type="button"
          onClick={() => router.push("/sign-in")}
          className={`mt-5 ${PRIMARY_BUTTON_CLASS}`}
        >
          Go to sign in
        </button>
      </AuthMobileShell>
    )
  }

  if (showSuccess) {
    return (
      <ConnectionSuccessScreen
        instanceName={connectedInstance}
        serverUrl={connectedUrl}
        onComplete={() => router.replace("/home")}
      />
    )
  }

  const prev = previousStep(step)

  return (
    <AuthMobileShell heroPage={1} compact>
      <AuthMobileCardHeader
        title={STEP_META[step].title}
        subtitle={`Step ${stepIndex(step) + 1} of ${SETUP_STEPS.length} — ${STEP_META[step].subtitle}`}
      />

      <SetupStepChrome step={step} />

      {prev ? (
        <button
          type="button"
          onClick={() => setStep(prev)}
          className="mt-2 text-left text-[12.5px] font-medium text-[#ff4f12] active:opacity-70"
        >
          ← Back
        </button>
      ) : null}

      <AuthMobileFormMessage message={error} />

      {step === "server" ? (
        <form onSubmit={handleContinueServer} className="mt-5 flex flex-col gap-3">
          <AuthMobileField
            id="setup-token"
            label="Setup token"
            icon={Key}
            type="password"
            placeholder="From install output or ARCIIN_SETUP_TOKEN in .env"
            value={setupToken}
            onChange={setSetupToken}
            dense
          />
          <p className="-mt-1 text-[11px] leading-snug text-[#a0a0a0]">
            Printed at the end of <span className="font-mono text-[10px]">./install.sh</span> and in{" "}
            <span className="font-mono text-[10px]">ARCIIN_SETUP_TOKEN</span> in your server{" "}
            <span className="font-mono text-[10px]">.env</span>. Open{" "}
            <span className="font-mono text-[10px]">/setup?token=…</span> from the install summary to
            prefill.
          </p>
          <AuthMobileField
            id="setup-instance-name"
            label="Instance name"
            icon={Server}
            placeholder="Local Instance"
            value={instanceName}
            onChange={setInstanceName}
            dense
          />
          <AuthMobileField
            id="setup-storage-root"
            label="Storage location"
            icon={HardDrive}
            placeholder="/srv/arciin-storage/arciin"
            value={storageRoot}
            onChange={setStorageRoot}
            mono
            dense
          />
          <button type="submit" disabled={busy} className={PRIMARY_BUTTON_CLASS}>
            {busy ? "Checking storage…" : "Continue"}
          </button>
        </form>
      ) : step === "account" ? (
        <form onSubmit={handleContinueAccount} className="mt-5 flex flex-col gap-3">
          <AuthMobileField
            id="setup-admin-name"
            label="Admin name"
            icon={User}
            placeholder="Admin name"
            value={adminName}
            onChange={setAdminName}
            dense
          />
          <AuthMobileField
            id="setup-admin-email"
            label="Admin email"
            icon={Mail}
            type="email"
            placeholder="you@example.com"
            value={adminEmail}
            onChange={setAdminEmail}
            autoComplete="email"
            dense
          />
          <AuthMobileField
            id="setup-admin-password"
            label="Admin password"
            icon={Lock}
            type={showPw ? "text" : "password"}
            placeholder="At least 8 characters"
            value={adminPassword}
            onChange={setAdminPassword}
            autoComplete="new-password"
            dense
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
            id="setup-confirm-password"
            label="Confirm password"
            icon={Lock}
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            dense
          />
          <button type="submit" className={PRIMARY_BUTTON_CLASS}>
            Continue
          </button>
        </form>
      ) : step === "security" ? (
        <form onSubmit={handleContinueSecurity} className="mt-5 flex flex-col gap-3">
          <AuthMobileField
            id="setup-recovery-question"
            label="Security question"
            icon={HelpCircle}
            placeholder="e.g. First pet's name?"
            value={recoveryQuestion}
            onChange={setRecoveryQuestion}
            dense
          />
          <AuthMobileField
            id="setup-recovery-answer"
            label="Security answer"
            icon={HelpCircle}
            placeholder="Your answer"
            value={recoveryAnswer}
            onChange={setRecoveryAnswer}
            dense
          />
          <button type="submit" className={PRIMARY_BUTTON_CLASS}>
            Continue
          </button>
          <button
            type="button"
            onClick={handleSkipSecurity}
            className="text-center text-[12.5px] font-medium text-[#717171] active:text-[#444444]"
          >
            Skip for now
          </button>
        </form>
      ) : (
        <form onSubmit={handleClaim} className="mt-5 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2">
            <div className="rounded-2xl border border-[#efefef] bg-[#fafafa] p-3">
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#a0a0a0]">
                Instance
              </div>
              <div className="mt-0.5 truncate text-[13px] font-medium text-[#222222]">
                {instanceName.trim() || "Local Instance"}
              </div>
            </div>
            <div className="rounded-2xl border border-[#efefef] bg-[#fafafa] p-3">
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#a0a0a0]">
                Storage
              </div>
              <div className="mt-0.5 truncate text-[13px] font-medium text-[#222222]">
                {storageRoot.trim() || "/srv/arciin-storage/arciin"}
              </div>
            </div>
            <div className="rounded-2xl border border-[#efefef] bg-[#fafafa] p-3">
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#a0a0a0]">
                Owner
              </div>
              <div className="mt-0.5 truncate text-[13px] font-medium text-[#222222]">
                {adminEmail.trim() || "owner@local"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-[#111111]">Default libraries</p>
              <span className="rounded-full border border-[#efefef] px-2 py-0.5 text-[10px] text-[#717171]">
                {libraries.length} selected
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#a0a0a0]">
              Keep at least one library enabled. Inbox is recommended as the catch-all for unknown
              file types during upload.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SETUP_LIBRARY_OPTIONS.map((library) => {
                const checked = libraries.includes(library)
                const Icon = setupLibraryMeta[library].icon
                return (
                  <button
                    key={library}
                    type="button"
                    onClick={() => toggleLibrary(library)}
                    className="flex flex-col gap-1.5 rounded-2xl border p-2.5 text-left transition-colors"
                    style={{
                      borderColor: checked ? "#ff4f12" : "#e8e8e8",
                      backgroundColor: checked ? "#fff7f4" : "#f7f7f7",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg border"
                        style={{
                          borderColor: checked ? "#ffc9b8" : "#e8e8e8",
                          backgroundColor: checked ? "#fff0eb" : "#ffffff",
                          color: checked ? "#ff4f12" : "#a0a0a0",
                        }}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      {checked ? <Check className="size-3.5 text-[#ff4f12]" /> : null}
                    </div>
                    <span className="truncate text-[13px] font-medium text-[#222222]">{library}</span>
                    <span className="line-clamp-2 text-[10.5px] leading-snug text-[#a0a0a0]">
                      {setupLibraryMeta[library].description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-[#a0a0a0]">
            First user becomes owner. Setup locks after the first successful claim. Passwords are
            hashed before storage.
          </p>

          <SetupLegalAcceptance
            checked={acceptedTerms}
            onChange={(next) => {
              setAcceptedTerms(next)
              if (next) setTermsError(null)
            }}
            error={termsError}
          />

          <button
            type="submit"
            disabled={busy || !acceptedTerms}
            className={`flex items-center justify-center gap-2 ${PRIMARY_BUTTON_CLASS}`}
          >
            <Sparkles className="size-4" />
            {busy ? "Claiming instance…" : "Claim instance"}
          </button>
        </form>
      )}
    </AuthMobileShell>
  )
}
