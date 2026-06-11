"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Share, Smartphone } from "lucide-react"

import { AuthMobileCardHeader, AuthMobileShell } from "@/components/auth/auth-mobile-shell"
import {
  detectMobileInstallPlatform,
  isStandaloneDisplayMode,
} from "@/lib/pwa/detect-standalone"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function StepRow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[13px] leading-relaxed text-[#444444]">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#fff1eb] text-[11px] font-bold text-[#ff4f12]">
        {n}
      </span>
      <span className="min-w-0 pt-0.5">{children}</span>
    </li>
  )
}

export function MobileInstallPage() {
  const router = useRouter()
  const [installed, setInstalled] = useState(false)
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other")
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    setInstalled(isStandaloneDisplayMode())
    setPlatform(detectMobileInstallPlatform())

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall)
  }, [])

  async function handleNativeInstall() {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
      setInstalled(isStandaloneDisplayMode())
    } finally {
      setInstalling(false)
    }
  }

  return (
    <AuthMobileShell heroPage={1}>
      <AuthMobileCardHeader
        title="Install Arciin Mobile"
        subtitle="Add this app to your home screen — no app store required. You still need an Arciin server, or use setup on this device."
      />

      <div className="mt-5 flex flex-1 flex-col gap-4">
        {installed ? (
          <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3.5">
            <p className="text-[13px] font-semibold text-[#15803d]">Already installed</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
              You&apos;re running Arciin from your home screen.
            </p>
          </div>
        ) : null}

        {!installed && platform === "android" && deferredPrompt ? (
          <button
            type="button"
            disabled={installing}
            onClick={() => void handleNativeInstall()}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#ff6a30] to-[#cc2e00] text-[15px] font-semibold text-white shadow-[0_4px_18px_rgba(255,79,18,0.30)] disabled:opacity-60"
          >
            <Download className="size-4" aria-hidden />
            {installing ? "Installing…" : "Install app"}
          </button>
        ) : null}

        {!installed && platform === "ios" ? (
          <div className="rounded-2xl border border-[#efefef] bg-[#fafafa] px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
              <Share className="size-3.5" aria-hidden />
              iPhone / iPad
            </div>
            <ol className="flex flex-col gap-3">
              <StepRow n={1}>
                Open this page in <strong>Safari</strong> (required for Add to Home Screen).
              </StepRow>
              <StepRow n={2}>
                Tap <strong>Share</strong> at the bottom of Safari.
              </StepRow>
              <StepRow n={3}>
                Choose <strong>Add to Home Screen</strong>, then tap Add.
              </StepRow>
            </ol>
          </div>
        ) : null}

        {!installed && platform === "android" && !deferredPrompt ? (
          <div className="rounded-2xl border border-[#efefef] bg-[#fafafa] px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
              <Smartphone className="size-3.5" aria-hidden />
              Android
            </div>
            <ol className="flex flex-col gap-3">
              <StepRow n={1}>Open this page in Chrome.</StepRow>
              <StepRow n={2}>
                Tap the menu (⋮), then <strong>Install app</strong> or{" "}
                <strong>Add to Home screen</strong>.
              </StepRow>
            </ol>
          </div>
        ) : null}

        {!installed && platform === "other" ? (
          <div className="rounded-2xl border border-[#efefef] bg-[#fafafa] px-4 py-4">
            <p className="text-[13px] leading-relaxed text-[#717171]">
              Open this URL on your phone, then use your browser&apos;s{" "}
              <strong>Add to Home Screen</strong> or <strong>Install</strong> option.
            </p>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(installed ? "/sign-in" : "/setup")}
            className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6a30] to-[#cc2e00] text-[15px] font-semibold text-white shadow-[0_4px_18px_rgba(255,79,18,0.30)]"
          >
            {installed ? "Continue to sign in" : "Continue to setup"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            className="flex h-[46px] w-full items-center justify-center rounded-2xl border border-[#e8e8e8] text-[14px] font-medium text-[#717171] active:bg-[#f0f0f0]"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </AuthMobileShell>
  )
}
