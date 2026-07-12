import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import { isStandaloneApp } from "@/lib/standalone/config"
import { isPrivateLanHostname } from "@/lib/connection/normalize-url"

const BLOCKED_PROTOCOLS = /^(javascript|data|file|ftp|gopher):/i

const CLOUD_METADATA_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.goog",
])

export type ValidateProxyApiBaseResult =
  | { ok: true; normalizedBase: string }
  | { ok: false; code: string; message: string }

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost")
}

function isLinkLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (CLOUD_METADATA_HOSTS.has(h)) return true
  if (h === "0.0.0.0") return true
  if (/^169\.254\./.test(h)) return true
  if (/^fe80:/i.test(h)) return true
  return false
}

function configuredApiOrigin(): string | null {
  const raw = process.env.ARCIIN_API_URL?.trim()
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

function loopbackProxyAllowed(apiOrigin: string): boolean {
  if (process.env.ARCIIN_ALLOW_PROXY_LOOPBACK === "true") return true
  const configured = configuredApiOrigin()
  if (configured && configured === apiOrigin) return true
  return process.env.NODE_ENV !== "production"
}

function isVercelHosted(): boolean {
  return Boolean(process.env.VERCEL)
}

/**
 * Validate a client-supplied Arciin API base before server-side fetch (SSRF / open-proxy guard).
 */
export function validateProxyApiBase(apiBase: string): ValidateProxyApiBaseResult {
  const trimmed = apiBase.trim().replace(/\/+$/, "")
  if (!trimmed) {
    return { ok: false, code: "BAD_REQUEST", message: "Missing server address." }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, code: "BAD_REQUEST", message: "Invalid server address." }
  }

  if (BLOCKED_PROTOCOLS.test(url.protocol)) {
    return { ok: false, code: "FORBIDDEN", message: "Unsupported server address." }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, code: "FORBIDDEN", message: "Server address must use HTTP or HTTPS." }
  }

  const hostname = url.hostname
  if (isLinkLocalHostname(hostname)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "That server address is not allowed.",
    }
  }

  if (isLoopbackHostname(hostname) && !loopbackProxyAllowed(url.origin)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Loopback server addresses are not allowed from this app host.",
    }
  }

  if (isVercelHosted() && isPrivateLanHostname(hostname)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "LAN server addresses cannot be proxied from the hosted app. Use your public HTTPS URL.",
    }
  }

  const isLan = isPrivateLanHostname(hostname)
  if (!isLan && url.protocol !== "https:") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Public server addresses must use HTTPS.",
    }
  }

  return { ok: true, normalizedBase: trimmed }
}

function configuredProxyHosts(): Set<string> {
  const hosts = new Set<string>()
  for (const raw of [process.env.ARCIIN_API_URL, process.env.ARCIIN_PUBLIC_URL]) {
    const value = raw?.trim()
    if (!value) continue
    try {
      hosts.add(new URL(value).hostname.toLowerCase())
    } catch {
      /* ignore */
    }
  }
  return hosts
}

/**
 * Unauthenticated proxy calls on a LAN-exposed install may only target this instance's API host.
 * Hosted (Vercel) companion mode may target the user's remote HTTPS server.
 */
export function isCoLocatedProxyTarget(apiBase: string): boolean {
  const allowedHosts = configuredProxyHosts()
  if (allowedHosts.size === 0) return false
  try {
    return allowedHosts.has(new URL(apiBase).hostname.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Co-located standalone mobile: browser sends the PWA origin (/api on :3002) but the
 * real Fastify API is ARCIIN_API_URL (:4000). Chat already resolves this server-side;
 * apply the same rule for /api/arciin/* JSON proxies (e.g. read-aloud TTS).
 */
export function resolveProxyUpstreamApiBase(
  suppliedApiBase: string | null | undefined,
  requestUrl: string,
): string | null {
  const trimmed = suppliedApiBase?.trim().replace(/\/+$/, "") ?? ""

  if (isStandaloneApp()) {
    const serverBase = getStandaloneApiBaseUrl().replace(/\/+$/, "")
    if (!trimmed) return serverBase

    try {
      const req = new URL(requestUrl)
      const supplied = new URL(trimmed)
      const sameHost = supplied.hostname.toLowerCase() === req.hostname.toLowerCase()
      const loopback =
        isLoopbackHostname(supplied.hostname) && isLoopbackHostname(req.hostname)
      const lanColocated =
        isPrivateLanHostname(supplied.hostname) &&
        isPrivateLanHostname(req.hostname) &&
        supplied.hostname.toLowerCase() === req.hostname.toLowerCase()

      if (sameHost || loopback || lanColocated) {
        return serverBase
      }
    } catch {
      return serverBase
    }
  }

  return trimmed || null
}

/** Remove proxy-only credentials from the upstream query string. */
export function buildUpstreamSearch(searchParams: URLSearchParams): string {
  const cleaned = new URLSearchParams(searchParams)
  cleaned.delete("access_token")
  cleaned.delete("api_base")
  const qs = cleaned.toString()
  return qs ? `?${qs}` : ""
}
