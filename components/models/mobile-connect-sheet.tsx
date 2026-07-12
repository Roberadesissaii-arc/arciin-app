"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, RefreshCw, X } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import {
  createModelProfile,
  getAvailableModels,
  getOllamaCloudModels,
  updateModelProfile,
} from "@/lib/api/models"
import type { ProviderMeta } from "@/lib/models/provider-catalog"
import {
  DEFAULT_GEMINI_CHAT_MODEL,
  DEFAULT_GEMINI_TTS_MODEL,
  GEMINI_CHAT_MODELS,
  GEMINI_TTS_MODELS,
} from "@/lib/models/gemini-catalog"
import { MobileOverlay } from "@/components/shell/mobile-bottom-sheet"
import type { CreateModelProfileInput, ModelProfile, OllamaCloudModelProbe } from "@/lib/types/models"
import { cn } from "@/lib/utils"

export function MobileConnectSheet({
  meta,
  profile,
  open,
  onClose,
  onSaved,
}: {
  meta: ProviderMeta
  profile: ModelProfile | undefined
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { connection, serverReachable } = useConnection()
  const serverOnline = serverReachable !== false
  const isEdit = Boolean(profile)
  const isOllamaLocal = meta.id === "ollama-local"
  const isOllamaCloud = meta.id === "ollama-cloud"
  const isAnyOllama = isOllamaLocal || isOllamaCloud
  const isGemini = meta.id === "gemini"

  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState(
    () => profile?.baseUrl ?? (isOllamaLocal ? "http://localhost:11434" : meta.baseUrlPlaceholder ?? ""),
  )
  const [model, setModel] = useState(
    () =>
      profile?.defaultModel ??
      (isAnyOllama ? "" : isGemini ? DEFAULT_GEMINI_CHAT_MODEL : meta.suggestedModels[0] ?? ""),
  )
  const [ttsModel, setTtsModel] = useState(
    () => profile?.ttsModel ?? (isGemini ? DEFAULT_GEMINI_TTS_MODEL : ""),
  )
  const [scannedModels, setScannedModels] = useState<string[]>([])
  const [cloudProbes, setCloudProbes] = useState<OllamaCloudModelProbe[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setApiKey("")
    setBaseUrl(profile?.baseUrl ?? (isOllamaLocal ? "http://localhost:11434" : meta.baseUrlPlaceholder ?? ""))
    setModel(
      profile?.defaultModel ??
        (isAnyOllama ? "" : isGemini ? DEFAULT_GEMINI_CHAT_MODEL : meta.suggestedModels[0] ?? ""),
    )
    setTtsModel(profile?.ttsModel ?? (isGemini ? DEFAULT_GEMINI_TTS_MODEL : ""))
    setScannedModels([])
    setCloudProbes([])
    setScanError(null)
    setError(null)
  }, [open, meta.id, profile?.id, isOllamaLocal, isAnyOllama, meta.baseUrlPlaceholder, meta.suggestedModels, profile?.baseUrl, profile?.defaultModel])

  useEffect(() => {
    if (!open || !isOllamaCloud || !isEdit || !profile?.hasApiKey || !connection) return
    void scanCloud(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when sheet opens for cloud edit
  }, [open, isOllamaCloud, isEdit, profile?.id, profile?.hasApiKey])

  if (!open) return null

  async function scanLocal() {
    if (!connection || !profile?.id) {
      setScanError("Save the connection first, then scan models on your Arciin server.")
      return
    }
    setScanning(true)
    setScanError(null)
    try {
      const { models } = await getAvailableModels(connection, profile.id, { refresh: true })
      setScannedModels(models)
      if (models.length > 0 && !model) setModel(models[0]!)
      if (models.length === 0) setScanError("No models found. Is Ollama running on your Arciin server?")
    } catch (err) {
      setScanError(formatApiError(err))
      setScannedModels([])
    } finally {
      setScanning(false)
    }
  }

  async function scanCloud(refresh: boolean) {
    if (!connection || !profile?.id) {
      setScanError("Save your API key first, then test models.")
      return
    }
    setScanning(true)
    setScanError(null)
    try {
      const { probes } = await getOllamaCloudModels(connection, profile.id, { refresh })
      setCloudProbes(probes)
      const available = probes.filter((p) => p.access === "available")
      if (available.length > 0 && !model) setModel(available[0]!.name)
      if (available.length === 0) {
        setScanError(
          "No models responded with your key. Paid models need a paid key; free models may be rate-limited.",
        )
      }
    } catch (err) {
      setScanError(formatApiError(err))
      setCloudProbes([])
    } finally {
      setScanning(false)
    }
  }

  async function handleSave() {
    if (!connection || !serverOnline) return
    setSaving(true)
    setError(null)
    const resolvedBaseUrl = isOllamaLocal
      ? (baseUrl || "http://localhost:11434")
      : isOllamaCloud
        ? "https://ollama.com"
        : baseUrl || null
    const input: CreateModelProfileInput = {
      provider: meta.id,
      displayName: isEdit ? (profile?.displayName ?? meta.name) : meta.name,
      defaultModel: model || null,
      baseUrl: resolvedBaseUrl,
      isEnabled: true,
    }
    if (isGemini) input.ttsModel = ttsModel.trim() || DEFAULT_GEMINI_TTS_MODEL
    if (apiKey) input.apiKey = apiKey

    const needsKey = isOllamaCloud || (meta.requiresKey && !isEdit)
    if (needsKey && !apiKey && !profile?.hasApiKey) {
      setError("API key is required.")
      setSaving(false)
      return
    }
    if (!isAnyOllama && meta.requiresBaseUrl && !resolvedBaseUrl) {
      setError("Base URL is required.")
      setSaving(false)
      return
    }

    try {
      if (isEdit && profile) {
        await updateModelProfile(connection, profile.id, input)
      } else {
        await createModelProfile(connection, input)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  const headerDescription = isOllamaLocal
    ? "Ollama runs on your Arciin server — not on this phone. Use the URL where Ollama listens on that machine."
    : isOllamaCloud
      ? "Add your ollama.com API key. Keys are stored only on your instance."
      : meta.requiresKey
        ? "Enter your API credentials. Keys stay on your Arciin server."
        : "Configure the endpoint."

  if (!open) return null

  return (
    <MobileOverlay open={open} onClose={onClose}>
      <div
        className="pointer-events-auto flex max-h-full w-full flex-col rounded-t-3xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_48px_rgba(0,0,0,0.18)]"
        style={{ borderTop: "1px solid #e5e5e5" }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#f0f0f0] px-5 py-4">
          <div>
            <p className="text-[16px] font-bold text-[#222222]">
              {isEdit ? `Configure ${meta.name}` : `Connect ${meta.name}`}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">{headerDescription}</p>
            <a
              href={meta.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent mt-1 inline-block text-[12px] font-semibold"
            >
              Get API key →
            </a>
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

        <div className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {isOllamaLocal ? (
            <>
              <Field label="Ollama URL on server" id="ollama-url">
                <input
                  id="ollama-url"
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value)
                    setScannedModels([])
                  }}
                  placeholder="http://localhost:11434"
                  className="w-full rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[16px] outline-none"
                  style={{ border: "1px solid #e5e5e5" }}
                />
              </Field>
              <Field label="Default model (optional)" id="ollama-model">
                <div className="flex gap-2">
                  <input
                    id="ollama-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="llama3.2"
                    className="min-w-0 flex-1 rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[16px] outline-none"
                    style={{ border: "1px solid #e5e5e5" }}
                  />
                  {isEdit ? (
                    <button
                      type="button"
                      disabled={scanning}
                      onClick={() => void scanLocal()}
                      className="flex shrink-0 items-center gap-1 rounded-xl px-3 text-[11px] font-semibold text-[#717171]"
                      style={{ border: "1px solid #e5e5e5" }}
                    >
                      {scanning ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                      Scan
                    </button>
                  ) : null}
                </div>
                {scanError ? <p className="mt-1 text-[11px] text-[#b91c1c]">{scanError}</p> : null}
                {scannedModels.length > 0 ? (
                  <div className="mt-2 overflow-hidden rounded-xl" style={{ border: "1px solid #e5e5e5" }}>
                    {scannedModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        className={cn(
                          "flex w-full items-center gap-2 border-b border-[#f0f0f0] px-3 py-2.5 font-mono text-[12px] last:border-0",
                          model === m ? "bg-accent-soft text-accent" : "text-[#222222]",
                        )}
                      >
                        {m}
                        {model === m ? <Check className="ml-auto size-3.5" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </Field>
            </>
          ) : null}

          {isOllamaCloud ? (
            <>
              <Field label="Ollama API key" id="cloud-key">
                <input
                  id="cloud-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    isEdit && profile?.hasApiKey
                      ? (profile.apiKeyMasked ?? "••••••••")
                      : "ollama_…"
                  }
                  className="w-full rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[16px] outline-none"
                  style={{ border: "1px solid #e5e5e5" }}
                />
              </Field>
              {isEdit && profile?.hasApiKey ? (
                <button
                  type="button"
                  disabled={scanning}
                  onClick={() => void scanCloud(true)}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold text-[#717171]"
                  style={{ border: "1px solid #e5e5e5" }}
                >
                  {scanning ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Test cloud models
                </button>
              ) : null}
              {scanError ? <p className="text-[11px] text-[#b45309]">{scanError}</p> : null}
              {cloudProbes.length > 0 ? (
                <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #e5e5e5" }}>
                  {cloudProbes.map((probe) => {
                    const canSelect = probe.access === "available"
                    return (
                      <button
                        key={probe.name}
                        type="button"
                        disabled={!canSelect}
                        onClick={() => canSelect && setModel(probe.name)}
                        className="flex w-full items-center gap-2 border-b border-[#f0f0f0] px-3 py-2.5 font-mono text-[12px] last:border-0 disabled:opacity-50"
                      >
                        <span className="flex-1 truncate text-left">{probe.name}</span>
                        {probe.access === "paid" ? (
                          <span className="text-[9px] uppercase text-amber-600">Paid</span>
                        ) : null}
                        {model === probe.name && canSelect ? (
                          <Check className="text-accent size-3.5" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </>
          ) : null}

          {!isAnyOllama ? (
            <>
              {meta.requiresKey ? (
                <Field label="API key" id="api-key">
                  <input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      isEdit && profile?.hasApiKey
                        ? (profile.apiKeyMasked ?? "••••••••")
                        : "sk-…"
                    }
                    className="w-full rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[16px] outline-none"
                    style={{ border: "1px solid #e5e5e5" }}
                  />
                </Field>
              ) : null}
              {(meta.requiresBaseUrl || meta.baseUrlPlaceholder) ? (
                <Field label="Base URL" id="base-url">
                  <input
                    id="base-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={meta.baseUrlPlaceholder ?? "https://api.example.com/v1"}
                    className="w-full rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[16px] outline-none"
                    style={{ border: "1px solid #e5e5e5" }}
                  />
                </Field>
              ) : null}
              <Field label={isGemini ? "Chat model" : "Default model"} id="default-model">
                <input
                  id="default-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={isGemini ? DEFAULT_GEMINI_CHAT_MODEL : meta.suggestedModels[0] ?? "model-id"}
                  className="w-full rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[16px] outline-none"
                  style={{ border: "1px solid #e5e5e5" }}
                />
                {isGemini ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {GEMINI_CHAT_MODELS.slice(0, 4).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setModel(entry.id)}
                        className={cn(
                          "rounded-lg px-2 py-1 font-mono text-[10px]",
                          model === entry.id
                            ? "accent-chip"
                            : "border border-[#e5e5e5] bg-white text-[#717171]",
                        )}
                      >
                        {entry.id}
                      </button>
                    ))}
                  </div>
                ) : null}
              </Field>
              {isGemini ? (
                <Field label="Read aloud model" id="tts-model">
                  <input
                    id="tts-model"
                    value={ttsModel}
                    onChange={(e) => setTtsModel(e.target.value)}
                    placeholder={DEFAULT_GEMINI_TTS_MODEL}
                    className="w-full rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[16px] outline-none"
                    style={{ border: "1px solid #e5e5e5" }}
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[#717171]">
                    Same API key as chat. Powers Listen on assistant replies.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {GEMINI_TTS_MODELS.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setTtsModel(entry.id)}
                        className={cn(
                          "rounded-lg px-2 py-1 font-mono text-[10px]",
                          ttsModel === entry.id
                            ? "accent-chip"
                            : "border border-[#e5e5e5] bg-white text-[#717171]",
                        )}
                      >
                        {entry.id}
                      </button>
                    ))}
                  </div>
                </Field>
              ) : null}
            </>
          ) : null}

          {error ? (
            <p className="rounded-xl px-3 py-2 text-[12px] text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[#f0f0f0] px-5 py-4 pb-8">
          <button
            type="button"
            disabled={saving || !serverOnline}
            onClick={() => void handleSave()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50",
              serverOnline ? "btn-accent-solid" : "bg-[#d4d4d4]",
            )}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Connect"}
          </button>
        </div>
      </div>
    </MobileOverlay>
  )
}

function Field({
  label,
  id,
  children,
}: {
  label: string
  id: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold text-[#717171]">
        {label}
      </label>
      {children}
    </div>
  )
}
