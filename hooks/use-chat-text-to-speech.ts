"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { synthesizeChatTts } from "@/lib/api/chat-tts"
import { ApiError, formatApiError } from "@/lib/api/errors"
import { loadSpeechVoices, pickNaturalSpeechVoice } from "@/lib/chat/pick-speech-voice"
import type { MobileConnection } from "@/lib/types/api"

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

export type ChatTtsSpeakResult =
  | { ok: true }
  | { ok: false; message: string; code?: string }

export function useChatTextToSpeech(
  connection: MobileConnection | null,
  profileId?: string | null,
) {
  const [speaking, setSpeaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const browserSupported =
    typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined"

  useEffect(() => {
    if (!browserSupported) return
    let cancelled = false
    void loadSpeechVoices().then((voices) => {
      if (!cancelled) voiceRef.current = pickNaturalSpeechVoice(voices)
    })
    return () => {
      cancelled = true
    }
  }, [browserSupported])

  const cleanupAudio = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    cleanupAudio()
    if (browserSupported) {
      window.speechSynthesis.cancel()
    }
    utteranceRef.current = null
    setSpeaking(false)
    setLoading(false)
  }, [browserSupported, cleanupAudio])

  const speakWithBrowser = useCallback(
    async (text: string): Promise<ChatTtsSpeakResult> => {
      if (!browserSupported) {
        return { ok: false, message: "Read aloud is not supported in this browser." }
      }
      let voice = voiceRef.current
      if (!voice) {
        const voices = await loadSpeechVoices()
        voice = pickNaturalSpeechVoice(voices)
        voiceRef.current = voice
      }
      const utterance = new SpeechSynthesisUtterance(text)
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      } else {
        utterance.lang = "en-US"
      }
      utterance.rate = 0.96
      utterance.onend = () => {
        utteranceRef.current = null
        setSpeaking(false)
      }
      utterance.onerror = () => {
        utteranceRef.current = null
        setSpeaking(false)
      }
      utteranceRef.current = utterance
      setSpeaking(true)
      window.speechSynthesis.speak(utterance)
      return { ok: true }
    },
    [browserSupported],
  )

  const speak = useCallback(
    async (text: string): Promise<ChatTtsSpeakResult> => {
      const trimmed = text.trim()
      if (!trimmed) return { ok: false, message: "Nothing to read aloud." }

      stop()
      setLastError(null)

      if (!connection) {
        return speakWithBrowser(trimmed)
      }

      setLoading(true)
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const result = await synthesizeChatTts(connection, {
          text: trimmed,
          profileId: profileId ?? undefined,
          signal: controller.signal,
        })
        if (controller.signal.aborted) {
          return { ok: false, message: "Read aloud cancelled." }
        }

        const blob = base64ToBlob(result.audioBase64, result.mimeType || "audio/wav")
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url
        const audio = new Audio(url)
        audio.setAttribute("playsinline", "true")
        audioRef.current = audio
        audio.onended = () => {
          setSpeaking(false)
          cleanupAudio()
        }
        audio.onerror = () => {
          setSpeaking(false)
          cleanupAudio()
          setLastError("Could not play generated audio.")
        }
        setSpeaking(true)
        await audio.play()
        return { ok: true }
      } catch (err) {
        if (controller.signal.aborted) {
          return { ok: false, message: "Read aloud cancelled." }
        }
        cleanupAudio()
        setSpeaking(false)
        const message =
          err instanceof ApiError
            ? formatApiError(err)
            : err instanceof Error
              ? err.message
              : "Gemini read aloud failed."
        setLastError(message)
        return {
          ok: false,
          message,
          code: err instanceof ApiError ? err.code : undefined,
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        setLoading(false)
      }
    },
    [cleanupAudio, connection, profileId, speakWithBrowser, stop],
  )

  useEffect(() => () => stop(), [stop])

  return {
    supported: true,
    speaking,
    loading,
    lastError,
    speak,
    stop,
  }
}
