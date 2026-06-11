"use client"

import { useEffect, useState } from "react"
import { Boxes, ChevronDown, Cloud, Loader2, X } from "lucide-react"

import { MobileOverlay } from "@/components/shell/mobile-bottom-sheet"
import { setChatSelection } from "@/lib/api/chat"
import { writeLocalChatSelection } from "@/lib/chat/chat-selection-storage"
import { getAvailableModels } from "@/lib/api/models"
import { chatModelForProfile } from "@/lib/models/model-helpers"
import { providerMetaFor } from "@/lib/models/provider-catalog"
import { isOllamaProvider, normalizeProviderId } from "@/lib/models/ollama-providers"
import type { MobileConnection } from "@/lib/types/api"
import type { ChatProfile } from "@/lib/types/chat"
import { cn } from "@/lib/utils"

function modelForNonOllamaProfile(profile: ChatProfile): string {
  const meta = providerMetaFor(normalizeProviderId(profile.provider))
  return chatModelForProfile({ defaultModel: profile.defaultModel }, meta)
}

function OllamaModelsSection({
  connection,
  profile,
  selectedProfile,
  selectedModel,
  onPickModel,
}: {
  connection: MobileConnection
  profile: ChatProfile
  selectedProfile: ChatProfile | null
  selectedModel: string
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

  if (models === null) {
    return (
      <div className="flex items-center gap-2 py-2 pl-2 text-[11px] text-[#717171]">
        <Loader2 className="size-3 animate-spin text-[#ff4f12]" />
        {isCloud ? "Loading cloud models…" : "Fetching Ollama models…"}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <p className="py-2 pl-2 text-[11px] leading-relaxed text-[#717171]">
        {error ??
          (isCloud
            ? "No cloud models found. Check your API key under Models."
            : "No models on your server. Run ollama pull on the Arciin host.")}
      </p>
    )
  }

  return (
    <ul className="mb-2 space-y-0.5 border-l-2 border-[#ff4f12]/20 pl-2">
      {error && models.length > 0 ? (
        <li className="py-1 text-[10px] text-amber-700">{error}</li>
      ) : null}
      {models.map((model) => {
        const active =
          selectedProfile?.id === profile.id &&
          (selectedModel === model || (!selectedModel.trim() && model === profile.defaultModel))
        return (
          <li key={model}>
            <button
              type="button"
              onClick={() => onPickModel(profile, model)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-mono text-[11px] active:opacity-90",
                active ? "bg-[#fff7f4] text-[#ff4f12]" : "text-[#444444] active:bg-[#f7f7f7]",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{model}</span>
              {isCloud ? <Cloud className="size-3 shrink-0 opacity-50" aria-hidden /> : null}
            </button>
          </li>
        )
      })}
    </ul>
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
  if (!open) return null

  return (
    <MobileOverlay open={open} onClose={onClose}>
      <div
        className="pointer-events-auto flex max-h-full w-full flex-col rounded-t-3xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_48px_rgba(0,0,0,0.18)]"
        style={{ borderTop: "1px solid #e5e5e5" }}
        role="dialog"
        aria-label="Choose model"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#f0f0f0] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-[#222222]">Chat model</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
              Pick a provider, then an Ollama model if applicable
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

        <ul className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {profiles.map((profile) => {
            const ollama = isOllamaProvider(profile.provider)
            const active = selectedProfile?.id === profile.id
            return (
              <li key={profile.id} className="mb-3 last:mb-0">
                {ollama ? (
                  <>
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2.5",
                        active ? "bg-[#fff7f4]" : "bg-[#f7f7f7]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[14px] font-semibold",
                          active ? "text-[#ff4f12]" : "text-[#222222]",
                        )}
                      >
                        {profile.displayName}
                        {profile.isDefault ? " · default" : ""}
                      </span>
                    </div>
                    <OllamaModelsSection
                      connection={connection}
                      profile={profile}
                      selectedProfile={selectedProfile}
                      selectedModel={selectedModel}
                      onPickModel={onPick}
                    />
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPick(profile, modelForNonOllamaProfile(profile))}
                    className={cn(
                      "flex w-full flex-col rounded-xl px-3 py-3 text-left active:opacity-90",
                      active ? "bg-[#fff7f4] ring-1 ring-[#ff4f12]/30" : "active:bg-[#f7f7f7]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[14px] font-semibold",
                        active ? "text-[#ff4f12]" : "text-[#222222]",
                      )}
                    >
                      {profile.displayName}
                    </span>
                    <span className="mt-0.5 truncate font-mono text-[11px] text-[#717171]">
                      {active && selectedModel
                        ? selectedModel
                        : modelForNonOllamaProfile(profile) || profile.provider}
                      {profile.isDefault ? " · default" : ""}
                    </span>
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </MobileOverlay>
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
    const resolved = model.trim() || profile.defaultModel?.trim() || ""
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
            <Boxes className="size-4 text-[#ff4f12]" strokeWidth={2} />
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
