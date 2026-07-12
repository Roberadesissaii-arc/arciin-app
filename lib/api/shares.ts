import { fetchApi } from "@/lib/api/client"
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

/** Full public link — works for anyone, no sign-in required, unlike the in-app deep link. */
export function shareResultUrl(connection: MobileConnection, result: CreateShareResult): string {
  const base = connection.webUrl.replace(/\/+$/, "")
  return `${base}${result.shareUrlPath}`
}
