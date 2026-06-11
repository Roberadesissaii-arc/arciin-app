export type VoiceQuality = "natural" | "limited" | "none"

/** voiceURI / name markers for genuinely neural / high-quality voices. */
const NATURAL_MARKERS = /natural|neural|premium|enhanced|wavenet|studio|online|siri/i

/** Apple's low-quality bundled voices — the robotic ones we want to avoid. */
const APPLE_COMPACT_URI = /com\.apple\.(voice\.(compact|super-compact)|ttsbundle)/i

/** Generic low-quality / embedded engines across platforms. */
const ROBOTIC_MARKERS =
  /compact|super-compact|espeak|festival|pico|flite|android(?!.*natural)|robot|eloquence/i

function isNetworkGoogleVoice(name: string, localService: boolean): boolean {
  // Chrome's "Google …" voices are server-rendered and noticeably more natural.
  return /google/i.test(name) && !localService
}

/** True when the voice is one of the modern neural / enhanced voices. */
export function isNaturalVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name ?? ""
  const uri = voice.voiceURI ?? ""
  if (APPLE_COMPACT_URI.test(uri) && !/premium|enhanced/i.test(uri)) return false
  if (NATURAL_MARKERS.test(name) || NATURAL_MARKERS.test(uri)) return true
  if (isNetworkGoogleVoice(name, voice.localService)) return true
  return false
}

/** Classify the best available voice so the UI can hint when only a robotic one exists. */
export function classifyVoiceQuality(voice: SpeechSynthesisVoice | null): VoiceQuality {
  if (!voice) return "none"
  return isNaturalVoice(voice) ? "natural" : "limited"
}

/** Prefer the most natural-sounding English voice the browser exposes. */
export function pickNaturalSpeechVoice(
  voices: SpeechSynthesisVoice[],
  lang = "en",
): SpeechSynthesisVoice | null {
  if (!voices.length) return null

  const langPrefix = lang.toLowerCase().split("-")[0]
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix))
  const pool = english.length > 0 ? english : voices

  const score = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase()
    const uri = (v.voiceURI ?? "").toLowerCase()
    let s = 0

    // Tier 1 — neural / premium engines (the genuinely human-sounding ones).
    if (/com\.apple\.voice\.premium/i.test(uri)) s += 120
    if (/com\.apple\.voice\.enhanced/i.test(uri)) s += 100
    if (/premium/.test(name)) s += 90
    if (/enhanced/.test(name)) s += 80
    if (/natural|neural|wavenet|studio/i.test(name)) s += 80
    if (/natural|neural|premium|enhanced/i.test(uri)) s += 50

    // Tier 2 — known good vendor voices.
    if (/google us english|google uk english/i.test(name)) s += 65
    if (/microsoft.*natural|aria|jenny|guy|sonia|ryan|libby|emma|brian/i.test(name)) s += 60
    if (/samantha|alex|karen|daniel|moira|tessa|fiona|aaron|nicky|nora|ava|allison|nathan|zoe|evan|joelle/i.test(name)) {
      s += 45
    }
    if (isNetworkGoogleVoice(v.name, v.localService)) s += 55
    if (/google/.test(name)) s += 30
    if (/microsoft/.test(name) && !/desktop|mobile/i.test(name)) s += 20

    // Network voices (no localService) tend to be the higher-fidelity ones.
    if (v.localService) s += 4
    else s += 14

    // Locale preference.
    if (/en-us/i.test(v.lang)) s += 15
    else if (/en-gb|en-au|en-ie/i.test(v.lang)) s += 10
    else if (/en/i.test(v.lang)) s += 5

    // Heavy penalties for the robotic / embedded voices.
    if (ROBOTIC_MARKERS.test(name)) s -= 120
    if (/eloquence/i.test(uri)) s -= 120
    if (APPLE_COMPACT_URI.test(uri) && !/premium|enhanced/i.test(uri)) s -= 70
    if (/desktop/i.test(name)) s -= 40

    return s
  }

  let best: SpeechSynthesisVoice | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  for (const v of pool) {
    const s = score(v)
    if (s > bestScore) {
      bestScore = s
      best = v
    }
  }

  return best
}

/** Voice to speak with: the user's saved choice when still installed, else the best auto-pick. */
export function resolveSpeechVoice(
  voices: SpeechSynthesisVoice[],
  preferredURI: string | null,
  lang = "en",
): SpeechSynthesisVoice | null {
  if (preferredURI) {
    const match = voices.find((v) => v.voiceURI === preferredURI)
    if (match) return match
  }
  return pickNaturalSpeechVoice(voices, lang)
}

/** English voices, most natural first — for the in-app voice picker. */
export function listEnglishSpeechVoices(
  voices: SpeechSynthesisVoice[],
  lang = "en",
): SpeechSynthesisVoice[] {
  const langPrefix = lang.toLowerCase().split("-")[0]
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix))
  const pool = english.length > 0 ? english : voices
  return [...pool].sort((a, b) => {
    const an = isNaturalVoice(a) ? 1 : 0
    const bn = isNaturalVoice(b) ? 1 : 0
    if (an !== bn) return bn - an
    return a.name.localeCompare(b.name)
  })
}

export function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([])
  }

  const synth = window.speechSynthesis
  const existing = synth.getVoices()
  if (existing.length > 0) return Promise.resolve(existing)

  return new Promise((resolve) => {
    const finish = () => resolve(synth.getVoices())
    const timeout = window.setTimeout(finish, 1500)
    synth.addEventListener(
      "voiceschanged",
      () => {
        window.clearTimeout(timeout)
        finish()
      },
      { once: true },
    )
    synth.getVoices()
  })
}
