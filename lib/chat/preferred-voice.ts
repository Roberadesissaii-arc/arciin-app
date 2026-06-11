/** Device-local read-aloud voice choice. Voices are per-device, so this never syncs to the server. */
const PREFERRED_VOICE_KEY = "arciin:preferred-voice-uri"

export function getPreferredVoiceURI(): string | null {
  try {
    return localStorage.getItem(PREFERRED_VOICE_KEY)
  } catch {
    return null
  }
}

export function setPreferredVoiceURI(uri: string | null): void {
  try {
    if (uri) localStorage.setItem(PREFERRED_VOICE_KEY, uri)
    else localStorage.removeItem(PREFERRED_VOICE_KEY)
  } catch {
    /* storage blocked — fall back to auto-pick */
  }
}
