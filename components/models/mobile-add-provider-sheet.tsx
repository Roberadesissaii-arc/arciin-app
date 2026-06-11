"use client"

import { useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { MobileOverlay } from "@/components/shell/mobile-bottom-sheet"
import { formatApiError } from "@/lib/api/errors"
import { createModelProfile } from "@/lib/api/models"
import type { ModelProfile } from "@/lib/types/models"
import { mobileInputClass } from "@/lib/ui/mobile-input"
import { cn } from "@/lib/utils"

const CUSTOM_PROVIDER_TYPES = [
  { id: "openai", label: "OpenAI-compatible", placeholder: "https://api.openai.com/v1" },
  { id: "anthropic", label: "Anthropic", placeholder: "https://api.anthropic.com" },
  { id: "gemini", label: "Google Gemini", placeholder: "https://generativelanguage.googleapis.com" },
  { id: "deepseek", label: "DeepSeek", placeholder: "https://api.deepseek.com/v1" },
] as const

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string
  id: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold text-[#717171]">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-[#a0a0a0]">{hint}</p> : null}
    </div>
  )
}

const inputClass = `${mobileInputClass} px-4 py-3 focus:bg-white`
const inputStyle = { border: "1px solid #e5e5e5" } as const

export function MobileAddProviderSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  models?: ModelProfile[]
  onClose: () => void
  onSaved: () => void
}) {
  const { connection, serverReachable } = useConnection()
  const serverOnline = serverReachable !== false

  const [providerType, setProviderType] = useState<(typeof CUSTOM_PROVIDER_TYPES)[number]["id"]>("openai")
  const [displayName, setDisplayName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const typeMeta = CUSTOM_PROVIDER_TYPES.find((t) => t.id === providerType) ?? CUSTOM_PROVIDER_TYPES[0]

  useEffect(() => {
    if (!open) return
    setProviderType("openai")
    setDisplayName("")
    setBaseUrl("")
    setApiKey("")
    setModel("")
    setError(null)
  }, [open])

  if (!open) return null

  async function handleCustomConnect() {
    if (!connection || !serverOnline) return
    const name = displayName.trim() || "Custom API"
    const url = baseUrl.trim()
    if (!url) {
      setError("API base URL is required.")
      return
    }
    if (!apiKey.trim()) {
      setError("API key is required.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createModelProfile(connection, {
        provider: providerType,
        displayName: name,
        baseUrl: url,
        apiKey: apiKey.trim(),
        defaultModel: model.trim() || null,
        isEnabled: true,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <MobileOverlay open={open} onClose={onClose}>
      <div
        className="pointer-events-auto flex max-h-full w-full flex-col rounded-t-3xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_48px_rgba(0,0,0,0.18)]"
        style={{ borderTop: "1px solid #e5e5e5" }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#f0f0f0] px-5 py-4">
          <div>
            <p className="text-[16px] font-bold text-[#222222]">Add AI provider</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
              Add a custom API endpoint. Credentials are stored on your Arciin server.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-[#717171] active:bg-[#f7f7f7]"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
          <div>
            <div className="flex flex-col gap-3">
              <Field label="Provider type" id="provider-type">
                <select
                  id="provider-type"
                  value={providerType}
                  onChange={(e) => {
                    const id = e.target.value as (typeof CUSTOM_PROVIDER_TYPES)[number]["id"]
                    setProviderType(id)
                    const next = CUSTOM_PROVIDER_TYPES.find((t) => t.id === id)
                    if (next) setBaseUrl(next.placeholder)
                  }}
                  className={inputClass}
                  style={inputStyle}
                >
                  {CUSTOM_PROVIDER_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Display name" id="custom-name" hint="How this provider appears in Arciin">
                <input
                  id="custom-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="My AI API"
                  className={inputClass}
                  style={inputStyle}
                />
              </Field>

              <Field
                label="API base URL"
                id="custom-base-url"
                hint="Full HTTPS endpoint, usually ending in /v1 for OpenAI-compatible APIs."
              >
                <input
                  id="custom-base-url"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={typeMeta.placeholder}
                  className={`${inputClass} font-mono`}
                  style={inputStyle}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </Field>

              <Field label="API key" id="custom-api-key">
                <input
                  id="custom-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-…"
                  className={`${inputClass} font-mono`}
                  style={inputStyle}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </Field>

              <Field label="Default model" id="custom-model" hint="Optional — e.g. gpt-4o-mini">
                <input
                  id="custom-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="model-id"
                  className={`${inputClass} font-mono`}
                  style={inputStyle}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </Field>
            </div>
          </div>

          {error ? (
            <p
              className="rounded-xl px-3 py-2 text-[12px] text-[#b91c1c]"
              style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[#f0f0f0] px-5 py-4 pb-8">
          <button
            type="button"
            disabled={saving || !serverOnline}
            onClick={() => void handleCustomConnect()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50",
              serverOnline ? "btn-accent-solid" : "bg-[#d4d4d4]",
            )}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Connect custom API
          </button>
        </div>
      </div>
    </MobileOverlay>
  )
}
