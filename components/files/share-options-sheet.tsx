"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { MobilePillSwitch } from "@/components/settings/mobile-toggle-row"
import { createShareLink, shareResultUrl } from "@/lib/api/shares"
import { getRemoteAccessSettings } from "@/lib/api/settings"
import { copyTextWithFallback } from "@/lib/utils/clipboard"
import type { MobileConnection } from "@/lib/types/api"
import type { AssetSummary } from "@/lib/types/assets"

/** navigator.share needs a secure context (https://) — silently unavailable over plain HTTP/LAN IP. */
function nativeShareSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof window !== "undefined" &&
    window.isSecureContext
  )
}

type ExpiryOption = "1" | "7" | "30" | "never"

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "never", label: "Never" },
]

/**
 * Share options for one or more files — matches desktop's share dialog
 * (note, expiry, allow-download) instead of jumping straight to "copy link"
 * with no choices. Renders its own created-link step with copy/native-share.
 */
export function ShareOptionsSheet({
  open,
  onClose,
  connection,
  assets,
}: {
  open: boolean
  onClose: () => void
  connection: MobileConnection
  assets: AssetSummary[]
}) {
  const [note, setNote] = useState("")
  const [expiry, setExpiry] = useState<ExpiryOption>("7")
  const [allowDownload, setAllowDownload] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [secureUrlHint, setSecureUrlHint] = useState<string | null>(null)

  const defaultLabel = assets.length === 1 ? assets[0]!.originalFilename : `${assets.length} files`
  const canNativeShare = nativeShareSupported()

  useEffect(() => {
    if (!createdUrl || canNativeShare) return
    let cancelled = false
    void getRemoteAccessSettings(connection)
      .then((settings) => {
        if (!cancelled) setSecureUrlHint(settings.mobilePublicUrl ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdUrl])

  function reset() {
    setNote("")
    setExpiry("7")
    setAllowDownload(true)
    setCreating(false)
    setError(null)
    setCreatedUrl(null)
    setCopied(false)
    setSecureUrlHint(null)
  }

  function handleClose() {
    onClose()
    reset()
  }

  async function handleCreate() {
    if (assets.length === 0) return
    setCreating(true)
    setError(null)
    try {
      const result = await createShareLink(connection, {
        resourceType: assets.length === 1 ? "ASSET" : "ASSETS",
        assetId: assets.length === 1 ? assets[0]!.id : undefined,
        assetIds: assets.length > 1 ? assets.map((a) => a.id) : undefined,
        label: note.trim() || defaultLabel,
        expiresInDays: expiry === "never" ? undefined : Number.parseInt(expiry, 10),
        allowDownload,
      })
      setCreatedUrl(shareResultUrl(connection, result))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create share link.")
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy() {
    if (!createdUrl) return
    const ok = await copyTextWithFallback(createdUrl)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleNativeShare() {
    if (!createdUrl || !canNativeShare) return
    try {
      await navigator.share({ title: note.trim() || defaultLabel, url: createdUrl })
    } catch {
      // user cancelled — nothing to do
    }
  }

  return (
    <MobileBottomSheet
      open={open}
      onClose={handleClose}
      title="Share"
      description={`Create a private link for ${defaultLabel}. Recipients only see this — not your full library.`}
    >
      {createdUrl ? (
        <div className="space-y-3">
          <p className="text-[12px] font-medium text-[#222222]">
            Copy this link now — it won&apos;t be shown again.
          </p>
          <div
            className="break-all rounded-xl px-3 py-2.5 font-mono text-[12px] text-[#222222]"
            style={{ border: "1px solid #e5e5e5", background: "#f7f7f7" }}
          >
            {createdUrl}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={
                canNativeShare
                  ? "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-semibold text-[#222222] active:bg-[#f0f0f0]"
                  : "btn-accent-solid flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-semibold active:opacity-90"
              }
              style={canNativeShare ? { border: "1px solid #e5e5e5" } : undefined}
            >
              {copied ? <Check className={canNativeShare ? "text-accent size-4" : "size-4"} /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            {canNativeShare ? (
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="btn-accent-solid flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-semibold active:opacity-90"
              >
                <Share2 className="size-4" />
                Share
              </button>
            ) : null}
          </div>
          {!canNativeShare ? (
            <p className="text-[11px] leading-relaxed text-[#a0a0a0]">
              The share-sheet button needs a secure (https://) connection, which this address
              doesn&apos;t have.
              {secureUrlHint ? (
                <>
                  {" "}Open Arciin at{" "}
                  <a href={secureUrlHint} className="text-accent font-medium">
                    {secureUrlHint}
                  </a>{" "}
                  to enable it — for now, use Copy link.
                </>
              ) : (
                <>
                  {" "}Turn on remote access in{" "}
                  <Link href="/profile/remote-access" className="text-accent font-medium">
                    Settings
                  </Link>{" "}
                  for an https:// link that supports it — for now, use Copy link.
                </>
              )}
            </p>
          ) : null}
          <p className="text-[11px] leading-relaxed text-[#a0a0a0]">
            Anyone with this link can view what you shared. They cannot browse your Arciin
            libraries or sign in as you.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-11 w-full items-center justify-center rounded-xl text-[13px] font-semibold text-[#717171] active:bg-[#f0f0f0]"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
              Note for recipients
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={defaultLabel}
              maxLength={200}
              className="h-11 w-full rounded-xl px-3 text-[14px] text-[#222222] outline-none"
              style={{ border: "1px solid #e5e5e5", background: "#f7f7f7" }}
            />
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
              Link expires
            </p>
            <div className="grid grid-cols-4 gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExpiry(opt.value)}
                  className={
                    expiry === opt.value
                      ? "btn-accent-solid h-10 rounded-xl text-[12px] font-semibold active:opacity-90"
                      : "h-10 rounded-xl text-[12px] font-semibold text-[#222222] active:bg-[#f0f0f0]"
                  }
                  style={expiry === opt.value ? undefined : { border: "1px solid #e5e5e5" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#a0a0a0]">
              After expiry the link stops working.
            </p>
          </div>

          <div style={{ borderTop: "1px solid #f0f0f0" }}>
            <MobilePillSwitch
              on={allowDownload}
              onChange={() => setAllowDownload((v) => !v)}
              label="Allow download"
              hint="Recipients can download files from this share. Preview is always available."
            />
          </div>

          {error ? <p className="text-[12px] text-[#dc2626]">{error}</p> : null}

          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreate()}
            className="btn-accent-solid flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold active:opacity-90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            Create share link
          </button>
        </div>
      )}
    </MobileBottomSheet>
  )
}
