"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Sparkles, Volume2, X } from "lucide-react"

import { MobileOverlay } from "@/components/shell/mobile-bottom-sheet"
import {
  isNaturalVoice,
  listEnglishSpeechVoices,
  loadSpeechVoices,
} from "@/lib/chat/pick-speech-voice"
import { getPreferredVoiceURI, setPreferredVoiceURI } from "@/lib/chat/preferred-voice"
import { cn } from "@/lib/utils"

const PREVIEW_TEXT = "Hi, this is how I sound when I read your answers aloud."

/** True on iOS, where the natural voices must be downloaded by the user. */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

export function VoicePickerSheet({
  open,
  onClose,
  onChange,
}: {
  open: boolean
  onClose: () => void
  /** Notifies the parent so the active speech voice refreshes immediately. */
  onChange?: () => void
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedURI, setSelectedURI] = useState<string | null>(null)
  const [previewURI, setPreviewURI] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setSelectedURI(getPreferredVoiceURI())
    void loadSpeechVoices().then((all) => {
      if (!cancelled) setVoices(listEnglishSpeechVoices(all))
    })
    return () => {
      cancelled = true
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [open])

  const preview = useCallback((voice: SpeechSynthesisVoice) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(PREVIEW_TEXT)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onend = () => setPreviewURI(null)
    utterance.onerror = () => setPreviewURI(null)
    setPreviewURI(voice.voiceURI)
    window.speechSynthesis.speak(utterance)
  }, [])

  function choose(uri: string | null) {
    setPreferredVoiceURI(uri)
    setSelectedURI(uri)
    onChange?.()
  }

  if (!open) return null

  return (
    <MobileOverlay open={open} onClose={onClose}>
      <div
        className="pointer-events-auto flex max-h-full w-full flex-col rounded-t-3xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_48px_rgba(0,0,0,0.18)]"
        style={{ borderTop: "1px solid #e5e5e5" }}
        role="dialog"
        aria-label="Choose read-aloud voice"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#f0f0f0] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[16px] font-bold text-[#222222]">Read-aloud voice</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#717171]">
              Tap a voice to hear it, then set it for chat
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

        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <button
            type="button"
            onClick={() => choose(null)}
            className={cn(
              "mb-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left active:opacity-90",
              selectedURI === null ? "bg-[#fff7f4] ring-1 ring-[#ff4f12]/30" : "bg-[#f7f7f7]",
            )}
          >
            <Sparkles
              className={cn("size-4 shrink-0", selectedURI === null ? "text-[#ff4f12]" : "text-[#a0a0a0]")}
            />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-[14px] font-semibold",
                  selectedURI === null ? "text-[#ff4f12]" : "text-[#222222]",
                )}
              >
                Best automatically
              </span>
              <span className="block text-[11px] text-[#717171]">
                Let the app pick the most natural voice
              </span>
            </span>
            {selectedURI === null ? <Check className="size-4 shrink-0 text-[#ff4f12]" /> : null}
          </button>

          {voices.length === 0 ? (
            <p className="px-1 py-2 text-[12px] leading-relaxed text-[#717171]">
              No voices found on this device yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {voices.map((voice) => {
                const active = selectedURI === voice.voiceURI
                const natural = isNaturalVoice(voice)
                return (
                  <li key={voice.voiceURI}>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2.5",
                        active ? "bg-[#fff7f4] ring-1 ring-[#ff4f12]/30" : "bg-[#f7f7f7]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => preview(voice)}
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-white active:opacity-80",
                          previewURI === voice.voiceURI ? "text-[#ff4f12]" : "text-[#717171]",
                        )}
                        style={{ border: "1px solid #e8e8e8" }}
                        aria-label={`Preview ${voice.name}`}
                      >
                        <Volume2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => choose(voice.voiceURI)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-[#222222]">
                            {voice.name}
                          </span>
                          <span className="block text-[11px] text-[#a0a0a0]">
                            {voice.lang}
                            {natural ? " · natural" : " · basic"}
                          </span>
                        </span>
                        {active ? <Check className="size-4 shrink-0 text-[#ff4f12]" /> : null}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {isIOS() ? (
            <p className="mt-3 rounded-xl bg-[#f7f7f7] px-3 py-2.5 text-[11px] leading-relaxed text-[#717171]">
              Only see “basic” voices? Download a natural one in iPhone Settings → Accessibility →
              Spoken Content (called Speech on older iOS) → Voices → English, tap a voice, then
              return here to select it.
            </p>
          ) : null}
        </div>
      </div>
    </MobileOverlay>
  )
}
