import { fetchApi } from "@/lib/api/client"
import { resolveDesktopWebBaseForAssets } from "@/lib/password-vault/desktop-web-base"
import type { MobileConnection } from "@/lib/types/api"

export type CreateShareInput = {
  resourceType: "ASSET" | "ASSETS" | "FOLDER"
  assetId?: string
  assetIds?: string[]
  folderId?: string
  label?: string
  expiresInDays?: number
  maxViews?: number
  allowDownload?: boolean
}

export type CreateShareResult = {
  id: string
  rawToken: string
  shareUrlPath: string
}

export function createShareLink(connection: MobileConnection, input: CreateShareInput) {
  return fetchApi<CreateShareResult>("/shares", {
    connection,
    method: "POST",
    body: input,
  })
}

/**
 * Full public link — works for anyone, no sign-in required, unlike the in-app deep link.
 *
 * The /s/[token] viewer page only exists in the desktop web app, not this PWA — using
 * connection.webUrl here would point at the mobile shell's own origin (it's overridden to
 * that on purpose for standalone installs) and 404. Resolve the desktop web origin instead,
 * same as the vault asset icons do.
 */
export function shareResultUrl(connection: MobileConnection, result: CreateShareResult): string {
  const base = (resolveDesktopWebBaseForAssets(connection) ?? connection.webUrl).replace(/\/+$/, "")
  return `${base}${result.shareUrlPath}`
}
