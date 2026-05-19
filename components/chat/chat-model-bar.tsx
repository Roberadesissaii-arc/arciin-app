"use client"

import { useState } from "react"
import { ChevronDown, Loader2, X } from "lucide-react"

import { setChatSelection } from "@/lib/api/chat"
import { chatModelForProfile } from "@/lib/models/model-helpers"
import { providerMetaFor } from "@/lib/models/provider-catalog"
import type { MobileConnection } from "@/lib/types/api"
import type { ChatProfile } from "@/lib/types/chat"
import type { ModelProfile } from "@/lib/types/models"
import { cn } from "@/lib/utils"

function modelForChatProfile(profile: ChatProfile): string {
  const meta = providerMetaFor(profile.provider)
  return chatModelForProfile(profile as ModelProfile, meta)
}

export function ChatModelBar({
  connection,
  profiles,
  selectedProfile,
  selectedModel,
  loading,
  onSelect,
}: {
  connection: MobileConnection
  profiles: ChatProfile[]
  selectedProfile: ChatProfile | null
  selectedModel: string
  loading?: boolean
  onSelect: (profile: ChatProfile, model: string) => void
}) {
  const [open, setOpen] = useState(false)

  const label =
    selectedModel ||
    selectedProfile?.defaultModel ||
    selectedProfile?.displayName ||
    (loading ? "Loading model…" : "Select model")

  async function pick(profile: ChatProfile) {
    const model =
      selectedProfile?.id === profile.id && selectedModel
        ? selectedModel
        : modelForChatProfile(profile)
    onSelect(profile, model)
    setOpen(false)
    try {
      await setChatSelection(connection, { profileId: profile.id, model })
    } catch {
      /* saved locally in parent */
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={loading || profiles.length === 0}
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl bg-[#f7f7f7] px-3 py-2.5 text-left active:bg-[#f0f0f0] disabled:opacity-50"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Model
          </p>
          <p className="truncate text-[13px] font-semibold text-[#222222]">{label}</p>
          {selectedProfile ? (
            <p className="truncate text-[11px] text-[#717171]">{selectedProfile.displayName}</p>
          ) : null}
        </div>
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-[#a0a0a0]" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-[#717171]" />
        )}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="mobile-overlay-root fixed inset-0 z-[100] bg-black/40"
            aria-label="Close model picker"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed inset-x-3 bottom-0 z-[100] max-h-[min(420px,70vh)] overflow-hidden rounded-t-2xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl"
            style={{ border: "1px solid #e5e5e5" }}
            role="dialog"
            aria-label="Choose model"
          >
            <div className="flex items-center justify-between border-b border-[#ececec] px-4 py-3">
              <span className="text-[15px] font-bold text-[#222222]">Chat model</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-full text-[#717171] active:bg-[#f7f7f7]"
              >
                <X className="size-4" />
              </button>
            </div>
            <ul className="overflow-y-auto p-2 scrollbar-hide">
              {profiles.map((profile) => {
                const active = selectedProfile?.id === profile.id
                return (
                  <li key={profile.id}>
                    <button
                      type="button"
                      onClick={() => void pick(profile)}
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
                      <span className="mt-0.5 text-[11px] text-[#717171]">
                        {profile.defaultModel || profile.provider}
                        {profile.isDefault ? " · default" : ""}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="border-t border-[#ececec] px-4 py-2.5 text-center text-[10px] text-[#a0a0a0]">
              Synced with desktop — same model on all devices
            </p>
          </div>
        </>
      ) : null}
    </>
  )
}
