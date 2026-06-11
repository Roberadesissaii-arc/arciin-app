"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronRight, Volume2 } from "lucide-react"

import { VoicePickerSheet } from "@/components/chat/voice-picker-sheet"
import { loadSpeechVoices, resolveSpeechVoice } from "@/lib/chat/pick-speech-voice"
import { getPreferredVoiceURI } from "@/lib/chat/preferred-voice"

/** Read-aloud voice chooser for Profile → Preferences. Device-local, no server sync. */
export function VoiceSettingRow() {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  const refresh = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false)
      return
    }
    void loadSpeechVoices().then((voices) => {
      const preferred = getPreferredVoiceURI()
      const voice = resolveSpeechVoice(voices, preferred)
      setLabel(preferred && voice ? voice.name : voice ? `Automatic · ${voice.name}` : "Automatic")
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (!supported) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Volume2 className="size-4 shrink-0 text-[#a0a0a0]" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#222222]">Read-aloud voice</p>
            <p className="truncate text-[11px] text-[#a0a0a0]">{label ?? "Tap to choose"}</p>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-[#c0c0c0]" />
      </button>
      <VoicePickerSheet open={open} onClose={() => setOpen(false)} onChange={refresh} />
    </>
  )
}
