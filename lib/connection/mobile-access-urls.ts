import type { RemoteAccessSettings } from "@/lib/types/models"

/** Origin of this phone PWA (e.g. http://192.168.4.53:3003). */
export function mobileAppWebOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin
  }
  const fromEnv = process.env.NEXT_PUBLIC_ARCIIN_PUBLIC_URL?.trim()
  return fromEnv ? fromEnv.replace(/\/+$/, "") : ""
}

/** LAN URLs for other devices to open Arciin Mobile — not the desktop web port. */
export function mobileLanUrls(
  settings: Pick<RemoteAccessSettings, "lanUrls" | "primaryLanUrl" | "localUrl">,
): string[] {
  const origin = mobileAppWebOrigin()
  if (origin) return [origin]

  const fromServer = settings.lanUrls?.length
    ? settings.lanUrls
    : settings.primaryLanUrl
      ? [settings.primaryLanUrl]
      : settings.localUrl
        ? [settings.localUrl]
        : []
  return fromServer
}

/** Public HTTPS URL for this phone app — prefers mobilePublicUrl over desktop publicUrl. */
export function mobileRemotePublicUrl(
  settings: Pick<RemoteAccessSettings, "mobilePublicUrl" | "publicUrl">,
): string {
  const mobile = settings.mobilePublicUrl?.trim()
  if (mobile) return mobile
  return settings.publicUrl?.trim() ?? ""
}
