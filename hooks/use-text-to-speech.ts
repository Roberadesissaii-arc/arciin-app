"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  classifyVoiceQuality,
  loadSpeechVoices,
  resolveSpeechVoice,
  type VoiceQuality,
} from "@/lib/chat/pick-speech-voice"
import { getPreferredVoiceURI } from "@/lib/chat/preferred-voice"

/** Neural voices sound best at natural cadence; compact voices get more robotic when slowed. */
const SPEECH_RATE = 1.0
const SPEECH_PITCH = 1.0

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

/** iOS cuts long utterances short — split on sentence boundaries. */
function splitForSpeech(text: string, maxLen = 300): string[] {
  if (text.length <= maxLen) return [text]
  const chunks: string[] = []
  let rest = text
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf(". ", maxLen)
    if (cut < maxLen * 0.4) cut = rest.lastIndexOf(" ", maxLen)
    if (cut < maxLen * 0.25) cut = maxLen
    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false)
  /** Quality of the best voice this device exposes — lets the UI hint when only a robotic one exists. */
  const [voiceQuality, setVoiceQuality] = useState<VoiceQuality>("none")
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const cancelledRef = useRef(false)
  const keepAliveRef = useRef<number | null>(null)

  const supported =
    typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined"

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      window.clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }, [])

  const startKeepAlive = useCallback(() => {
    if (!isIOSDevice()) return
    clearKeepAlive()
    keepAliveRef.current = window.setInterval(() => {
      const synth = window.speechSynthesis
      if (synth.speaking && synth.paused) synth.resume()
    }, 800)
  }, [clearKeepAlive])

  useEffect(() => {
    if (!supported) return
    let cancelled = false

    void loadSpeechVoices().then((voices) => {
      if (cancelled) return
      const picked = resolveSpeechVoice(voices, getPreferredVoiceURI())
      voiceRef.current = picked
      setVoiceQuality(classifyVoiceQuality(picked))
    })

    const onVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        const picked = resolveSpeechVoice(voices, getPreferredVoiceURI())
        voiceRef.current = picked
        setVoiceQuality(classifyVoiceQuality(picked))
      }
    }
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged)
    return () => {
      cancelled = true
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged)
    }
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    cancelledRef.current = true
    clearKeepAlive()
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setSpeaking(false)
  }, [clearKeepAlive, supported])

  const speakOne = useCallback(
    (text: string, voice: SpeechSynthesisVoice | null): Promise<void> =>
      new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text)
        if (voice) {
          utterance.voice = voice
          utterance.lang = voice.lang
        } else {
          utterance.lang = "en-US"
        }
        utterance.rate = SPEECH_RATE
        utterance.pitch = SPEECH_PITCH
        utterance.onend = () => {
          utteranceRef.current = null
          resolve()
        }
        utterance.onerror = () => {
          utteranceRef.current = null
          resolve()
        }
        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }),
    [],
  )

  const speak = useCallback(
    async (text: string) => {
      if (!supported) return false
      const trimmed = text.trim()
      if (!trimmed) return false

      stop()
      cancelledRef.current = false

      const voices = await loadSpeechVoices()
      const voice = resolveSpeechVoice(voices, getPreferredVoiceURI())
      voiceRef.current = voice
      setVoiceQuality(classifyVoiceQuality(voice))

      const chunks =
        isIOSDevice() && trimmed.length > 300 ? splitForSpeech(trimmed) : [trimmed]

      setSpeaking(true)
      startKeepAlive()

      for (let i = 0; i < chunks.length; i++) {
        if (cancelledRef.current) break
        const chunk = chunks[i]!
        if (i > 0 && isIOSDevice()) {
          await delay(80)
        }
        if (cancelledRef.current) break
        await speakOne(chunk, voiceRef.current)
      }

      clearKeepAlive()
      if (!cancelledRef.current) setSpeaking(false)
      return !cancelledRef.current
    },
    [clearKeepAlive, speakOne, startKeepAlive, stop, supported],
  )

  const toggle = useCallback(
    (text: string) => {
      if (speaking) {
        stop()
        return
      }
      void speak(text)
    },
    [speak, speaking, stop],
  )

  useEffect(() => () => stop(), [stop])

  return { supported, speaking, speak, stop, toggle, voiceQuality, isIOS: isIOSDevice() }
}
