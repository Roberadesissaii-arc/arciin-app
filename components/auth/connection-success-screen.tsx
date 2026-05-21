"use client"

import { useEffect, useState } from "react"

type Phase = "connecting" | "connected" | "leaving"

const REDIRECT_MS = 3800

export function ConnectionSuccessScreen({
  instanceName,
  serverUrl,
  onComplete,
}: {
  instanceName: string
  serverUrl: string
  onComplete: () => void
}) {
  const [phase, setPhase] = useState<Phase>("connecting")

  useEffect(() => {
    const toConnected = window.setTimeout(() => setPhase("connected"), 720)
    const toLeaving = window.setTimeout(() => setPhase("leaving"), 2800)
    const done = window.setTimeout(() => onComplete(), REDIRECT_MS)
    return () => {
      window.clearTimeout(toConnected)
      window.clearTimeout(toLeaving)
      window.clearTimeout(done)
    }
  }, [onComplete])

  const showCheck = phase === "connected" || phase === "leaving"
  const displayUrl = serverUrl.trim()

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden px-6 pt-safe pb-safe"
      style={{
        background:
          "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(255,79,18,0.14) 0%, transparent 55%), #09090b",
      }}
      role="status"
      aria-live="polite"
      aria-busy={phase !== "leaving"}
    >
      {/* ambient ripples */}
      {showCheck ? (
        <>
          <span
            className="pointer-events-none absolute size-[220px] rounded-full border border-[#ff4f12]/25"
            style={{ animation: "arciin-ripple 1.8s ease-out infinite" }}
          />
          <span
            className="pointer-events-none absolute size-[220px] rounded-full border border-[#ff4f12]/15"
            style={{ animation: "arciin-ripple 1.8s ease-out 0.45s infinite" }}
          />
        </>
      ) : null}

      <div
        className="relative flex w-full max-w-[340px] flex-col items-center text-center transition-opacity duration-300"
        style={{ opacity: phase === "leaving" ? 0.92 : 1 }}
      >
        <div className="relative mb-8 flex size-[120px] items-center justify-center">
          {phase === "connecting" ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative size-[88px]">
                <span
                  className="absolute inset-0 rounded-full border-2 border-[#ff4f12]/20"
                  style={{ animation: "arciin-ripple 1.4s ease-out infinite" }}
                />
                <span
                  className="absolute inset-2 rounded-full border-2 border-[#ff4f12]/35"
                  style={{ animation: "arciin-ripple 1.4s ease-out 0.35s infinite" }}
                />
                <span className="absolute inset-[18px] flex items-center justify-center rounded-full bg-[#18181b]">
                  <span className="size-8 animate-spin rounded-full border-2 border-[#ff4f12]/30 border-t-[#ff4f12]" />
                </span>
              </div>
            </div>
          ) : (
            <div
              className="relative flex size-[120px] items-center justify-center"
              style={{ animation: "arciin-scale-in 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) forwards" }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,79,18,0.35) 0%, rgba(255,79,18,0.08) 45%, transparent 70%)",
                }}
              />
              <svg
                viewBox="0 0 96 96"
                className="relative size-[96px]"
                aria-hidden
              >
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke="#ff4f12"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="264"
                  strokeDashoffset={showCheck ? "0" : "264"}
                  style={{
                    transition: "stroke-dashoffset 0.65s ease",
                  }}
                />
                <path
                  d="M28 48 L42 62 L68 34"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="72"
                  strokeDashoffset={showCheck ? "0" : "72"}
                  style={{
                    transition: "stroke-dashoffset 0.45s ease 0.35s",
                  }}
                />
              </svg>
              {showCheck ? <SuccessParticles /> : null}
            </div>
          )}
        </div>

        <div className="w-full space-y-2" style={{ animation: "arciin-fade-up 0.5s ease 0.15s both" }}>
          <p
            className="text-[28px] font-bold tracking-tight text-white"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            {phase === "connecting" ? "Connecting…" : "Connected"}
          </p>
          {phase !== "connecting" ? (
            <p className="text-[14px] font-medium text-[#ff6a33]">{instanceName}</p>
          ) : (
            <p className="text-[13px] text-[#a1a1aa]">Securing your session</p>
          )}
        </div>

        {displayUrl && phase !== "connecting" ? (
          <p
            className="mt-3 w-full break-all px-2 text-[12px] leading-relaxed text-[#71717a]"
            style={{ animation: "arciin-fade-up 0.45s ease 0.25s both" }}
          >
            {displayUrl}
          </p>
        ) : null}

        <p
          className="mt-10 text-[12px] font-medium text-[#52525b]"
          style={{ animation: "arciin-fade-up 0.4s ease 0.4s both" }}
        >
          {phase === "leaving"
            ? "Opening your dashboard…"
            : phase === "connected"
              ? "You're all set — heading in shortly"
              : "Verifying your server"}
        </p>

        {phase === "connecting" ? (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 rounded-full bg-[#ff4f12]"
                style={{
                  animation: "arciin-dot-bounce 1s ease infinite",
                  animationDelay: `${i * 0.14}s`,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SuccessParticles() {
  const dots = [
    { top: "8%", left: "18%", delay: "0s" },
    { top: "12%", right: "14%", delay: "0.08s" },
    { top: "72%", left: "8%", delay: "0.12s" },
    { top: "78%", right: "10%", delay: "0.05s" },
    { bottom: "22%", left: "22%", delay: "0.18s" },
    { bottom: "18%", right: "20%", delay: "0.1s" },
  ]
  return (
    <>
      {dots.map((d, i) => (
        <span
          key={i}
          className="pointer-events-none absolute size-1.5 rounded-full bg-[#ff4f12]"
          style={{
            ...d,
            opacity: 0,
            animation: "arciin-fade-up 0.5s ease forwards",
            animationDelay: d.delay,
          }}
        />
      ))}
    </>
  )
}
