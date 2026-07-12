"use client"

import { useEffect, useState } from "react"
import { Brain, Boxes, ChevronDown, Cloud, Eye, Loader2 } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { setChatSelection } from "@/lib/api/chat"
import { writeLocalChatSelection } from "@/lib/chat/chat-selection-storage"
import { getAvailableModels } from "@/lib/api/models"
import {
  ollamaCapabilityMap,
  useOllamaModelCapabilities,
} from "@/lib/hooks/use-ollama-model-capabilities"
import { chatModelForProfile } from "@/lib/models/model-helpers"
import { providerMetaFor } from "@/lib/models/provider-catalog"
import { isOllamaProvider, normalizeProviderId } from "@/lib/models/ollama-providers"
import type { MobileConnection } from "@/lib/types/api"
import type { ChatProfile } from "@/lib/types/chat"
import { cn } from "@/lib/utils"

function catalogueModelsForProfile(profile: ChatProfile): string[] {
  const meta = providerMetaFor(normalizeProviderId(profile.provider))
  const catalogue = meta?.suggestedModels ?? []
  const savedDefault = profile.defaultModel?.trim()
  if (savedDefault && !catalogue.includes(savedDefault)) {
    return [savedDefault, ...catalogue]
  }
  if (catalogue.length > 0) return catalogue
  return savedDefault ? [savedDefault] : []
}

/** Cloud → vision eye → thinking — icons only (capabilities from Ollama /api/show). */
function ModelRowTrailingIcons({
  isCloud,
  vision,
  thinking,
}: {
  isCloud: boolean
  vision: boolean
  thinking: boolean
}) {
  if (!isCloud && !vision && !thinking) return null
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {isCloud ? (
        <Cloud className="size-3.5 shrink-0 opacity-45" aria-label="Ollama Cloud" />
      ) : null}
      {vision ? (
        <Eye className="size-3.5 shrink-0 text-violet-600" aria-label="Vision — supports images" />
      ) : null}
      {thinking ? (
        <Brain
          className="size-3.5 shrink-0 text-sky-600 opacity-70"
          aria-label="Thinking — reasoning traces"
        />
      ) : null}
    </span>
  )
}

function OllamaModelsSection({
  connection,
  profile,
  selectedProfile,
  selectedModel,
  capabilitiesEnabled,
  onPickModel,
}: {
  connection: MobileConnection
  profile: ChatProfile
  selectedProfile: ChatProfile | null
  selectedModel: string
  capabilitiesEnabled: boolean
  onPickModel: (profile: ChatProfile, model: string) => void
}) {
  const [models, setModels] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isCloud = profile.provider === "ollama-cloud"

  useEffect(() => {
    let cancelled = false
    setModels(null)
    setError(null)
    void getAvailableModels(connection, profile.id)
      .then((result) => {
        if (!cancelled) {
          setModels(result.models.length > 0 ? result.models : profile.defaultModel ? [profile.defaultModel] : [])
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load models")
          setModels(profile.defaultModel ? [profile.defaultModel] : [])
        }
      })
    return () => {
      cancelled = true
    }
  }, [connection, profile.defaultModel, profile.id])

  const capQuery = useOllamaModelCapabilities(
    connection,
    profile.id,
    models ?? [],
    capabilitiesEnabled && Boolean(models?.length),
  )
  const capMap = ollamaCapabilityMap(capQuery.entries)
  const capsProbing = capQuery.isFetching && capMap.size === 0

  if (models === null) {
    return (
      <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-3 py-3 text-[11px] text-[#717171]">
        <Loader2 className="size-3 animate-spin text-accent" />
        {isCloud ? "Loading cloud models…" : "Fetching Ollama models…"}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <p className="border-b border-[#f0f0f0] px-3 py-2.5 text-[11px] leading-relaxed text-[#717171]">
        {error ??
          (isCloud
            ? "No cloud models found. Check your API key under Models."
            : "No models on your server. Run ollama pull on the Arciin host.")}
      </p>
    )
  }

  return (
    <>
      {error ? (
        <p className="border-b border-[#f0f0f0] px-3 py-2 text-[10px] text-amber-700">{error}</p>
      ) : null}
      {models.map((model) => {
        const active =
          selectedProfile?.id === profile.id &&
          (selectedModel === model || (!selectedModel.trim() && model === profile.defaultModel))
        return (
          <button
            key={model}
            type="button"
            onClick={() => onPickModel(profile, model)}
            className={cn(
              "flex w-full items-center gap-2 border-b border-[#f0f0f0] px-3 py-2.5 text-left font-mono text-[12px] last:border-0 active:opacity-90",
              active ? "bg-[#fff4f0] text-[#c2410c]" : "text-[#222222] active:bg-[#f7f7f7]",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{model}</span>
            <ModelRowTrailingIcons
              isCloud={isCloud}
              vision={capMap.get(model)?.vision ?? false}
              thinking={capMap.get(model)?.thinking ?? false}
            />
            {capsProbing ? (
              <Loader2 className="size-3 shrink-0 animate-spin opacity-40" aria-hidden />
            ) : null}
            {active ? (
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-accent opacity-80">
                active
              </span>
            ) : null}
          </button>
        )
      })}
    </>
  )
}

function ProviderModelsSection({
  profile,
  selectedProfile,
  selectedModel,
  onPickModel,
}: {
  profile: ChatProfile
  selectedProfile: ChatProfile | null
  selectedModel: string
  onPickModel: (profile: ChatProfile, model: string) => void
}) {
  const models = catalogueModelsForProfile(profile)
  const savedDefault = profile.defaultModel

  if (models.length === 0) {
    return (
      <p className="border-b border-[#f0f0f0] px-3 py-2.5 text-[11px] text-[#717171]">
        {profile.provider}
      </p>
    )
  }

  return (
    <>
      {models.map((model) => {
        const active =
          selectedProfile?.id === profile.id &&
          (selectedModel === model || (!selectedModel.trim() && model === savedDefault))
        return (
          <button
            key={model}
            type="button"
            onClick={() => onPickModel(profile, model)}
            className={cn(
              "flex w-full items-center gap-2 border-b border-[#f0f0f0] px-3 py-2 text-left font-mono text-[12px] last:border-0 active:opacity-90",
              active ? "bg-[#fff4f0] text-[#c2410c]" : "text-[#222222] active:bg-[#f7f7f7]",
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                active ? "bg-accent" : "bg-[#d4d4d4]",
              )}
            />
            <span className="min-w-0 flex-1 truncate">{model}</span>
            {active ? (
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-accent opacity-80">
                active
              </span>
            ) : null}
          </button>
        )
      })}
    </>
  )
}

function ChatModelPickerSheet({
  open,
  onClose,
  connection,
  profiles,
  selectedProfile,
  selectedModel,
  onPick,
}: {
  open: boolean
  onClose: () => void
  connection: MobileConnection
  profiles: ChatProfile[]
  selectedProfile: ChatProfile | null
  selectedModel: string
  onPick: (profile: ChatProfile, model: string) => void
}) {
  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="Chat model"
      description="Pick a provider, then choose a model"
      ariaLabel="Choose model"
      panelClassName="max-h-[min(85vh,640px)]"
    >
      <div className="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white">
        {profiles.map((profile) => {
          const ollama = isOllamaProvider(profile.provider)
          return (
            <div key={profile.id}>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#f0f0f0] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#717171]">
                <span>{profile.displayName}</span>
                {profile.isDefault ? (
                  <span className="rounded bg-amber-50 px-1.5 py-px text-[9px] font-semibold text-amber-700 ring-1 ring-amber-200">
                    Default
                  </span>
                ) : null}
              </div>
              {ollama ? (
                <OllamaModelsSection
                  connection={connection}
                  profile={profile}
                  selectedProfile={selectedProfile}
                  selectedModel={selectedModel}
                  capabilitiesEnabled={open}
                  onPickModel={onPick}
                />
              ) : (
                <ProviderModelsSection
                  profile={profile}
                  selectedProfile={selectedProfile}
                  selectedModel={selectedModel}
                  onPickModel={onPick}
                />
              )}
            </div>
          )
        })}
      </div>
    </MobileBottomSheet>
  )
}

export function ChatModelBar({
  connection,
  profiles,
  selectedProfile,
  selectedModel,
  loading,
  onSelect,
  variant = "bar",
}: {
  connection: MobileConnection
  profiles: ChatProfile[]
  selectedProfile: ChatProfile | null
  selectedModel: string
  loading?: boolean
  onSelect: (profile: ChatProfile, model: string) => void
  variant?: "bar" | "composer"
}) {
  const [open, setOpen] = useState(false)

  const label =
    selectedModel.trim() ||
    selectedProfile?.defaultModel ||
    selectedProfile?.displayName ||
    (loading ? "…" : "Model")

  async function pick(profile: ChatProfile, model: string) {
    const resolved = model.trim() || profile.defaultModel?.trim() || chatModelForProfile(profile, providerMetaFor(normalizeProviderId(profile.provider))) || ""
    onSelect(profile, resolved)
    setOpen(false)
    if (resolved) {
      writeLocalChatSelection(profile.id, resolved)
      try {
        await setChatSelection(connection, { profileId: profile.id, model: resolved })
      } catch {
        /* keep local selection */
      }
    }
  }

  const trigger =
    variant === "composer" ? (
      <button
        type="button"
        disabled={loading || profiles.length === 0}
        onClick={() => setOpen(true)}
        className="text-accent flex size-9 shrink-0 items-center justify-center rounded-xl active:bg-[#f7f7f7] disabled:opacity-40"
        style={{ border: "1px solid #e5e5e5" }}
        aria-label={`Model: ${label}`}
        title={label}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin text-[#a0a0a0]" />
        ) : (
          <Boxes className="size-[18px]" strokeWidth={2} />
        )}
      </button>
    ) : (
      <button
        type="button"
        disabled={loading || profiles.length === 0}
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl bg-[#f7f7f7] px-3 py-2.5 text-left active:bg-[#f0f0f0] disabled:opacity-50"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white"
            style={{ border: "1px solid #e8e8e8" }}
          >
            <Boxes className="size-4 text-accent" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
              Model
            </p>
            <p className="truncate text-[13px] font-semibold text-[#222222]">{label}</p>
            {selectedProfile ? (
              <p className="truncate text-[11px] text-[#717171]">{selectedProfile.displayName}</p>
            ) : null}
          </div>
        </div>
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-[#a0a0a0]" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-[#717171]" />
        )}
      </button>
    )

  return (
    <>
      {trigger}
      <ChatModelPickerSheet
        open={open}
        onClose={() => setOpen(false)}
        connection={connection}
        profiles={profiles}
        selectedProfile={selectedProfile}
        selectedModel={selectedModel}
        onPick={(profile, model) => void pick(profile, model)}
      />
    </>
  )
}
