const STORAGE_KEY = "arciin.mobileUserAvatar.v1"

type CachedAvatar = {
  userId: string
  dataUrl: string
  updatedAt?: string
}

export function readCachedUserAvatarDataUrl(
  userId: string | undefined,
  updatedAt?: string,
): string | null {
  if (!userId || typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedAvatar
    if (parsed.userId !== userId) return null
    if (updatedAt && parsed.updatedAt && parsed.updatedAt !== updatedAt) return null
    return parsed.dataUrl
  } catch {
    return null
  }
}

export function writeCachedUserAvatarDataUrl(
  userId: string,
  dataUrl: string,
  updatedAt?: string,
) {
  if (typeof window === "undefined") return
  try {
    const payload: CachedAvatar = { userId, dataUrl, updatedAt }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode
  }
}

export function clearCachedUserAvatar(userId?: string) {
  if (typeof window === "undefined") return
  try {
    if (!userId) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    if (readCachedUserAvatarDataUrl(userId)) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function cacheUserAvatarBlob(
  userId: string,
  blob: Blob,
  updatedAt?: string,
) {
  try {
    const dataUrl = await blobToDataUrl(blob)
    writeCachedUserAvatarDataUrl(userId, dataUrl, updatedAt)
    return dataUrl
  } catch {
    return null
  }
}
