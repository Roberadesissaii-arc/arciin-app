import { resolveDesktopWebBaseForAssets } from "@/lib/password-vault/desktop-web-base"
import type { MobileConnection } from "@/lib/types/api"

/** Resolve a vault brand icon path against candidate web origins (desktop first). */
export function resolveVaultAssetUrl(path: string, webBase?: string | null): string {
  return resolveVaultAssetUrlCandidates(path, webBase)[0] ?? path
}

export function resolveVaultAssetUrlCandidates(
  path: string,
  webBase?: string | null,
  connection?: Pick<MobileConnection, "apiBaseUrl" | "webUrl"> | null,
): string[] {
  if (path.startsWith("http")) return [path]

  const seen = new Set<string>()
  const urls: string[] = []

  const pushBase = (base?: string | null) => {
    const root = (base ?? "").replace(/\/$/, "")
    if (!root) return
    const full = `${root}${path.startsWith("/") ? path : `/${path}`}`
    if (!seen.has(full)) {
      seen.add(full)
      urls.push(full)
    }
  }

  pushBase(webBase)
  pushBase(resolveDesktopWebBaseForAssets(connection ?? null))

  if (typeof window !== "undefined") {
    pushBase(window.location.origin)
  }

  if (path.startsWith("/") && !seen.has(path)) {
    urls.push(path)
  }

  return urls
}
