const PROFILE_KEY = "arciin:chat:selected-profile-id"
const MODEL_KEY = "arciin:chat:selected-model"

export type LocalChatSelection = {
  profileId: string
  model: string
}

export function readLocalChatSelection(): LocalChatSelection | null {
  if (typeof window === "undefined") return null
  try {
    const profileId = localStorage.getItem(PROFILE_KEY)
    if (!profileId) return null
    return {
      profileId,
      model: localStorage.getItem(MODEL_KEY) ?? "",
    }
  } catch {
    return null
  }
}

export function writeLocalChatSelection(profileId: string, model: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(PROFILE_KEY, profileId)
    localStorage.setItem(MODEL_KEY, model)
  } catch {
    /* private mode / quota */
  }
}
