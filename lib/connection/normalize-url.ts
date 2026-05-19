const BLOCKED_PROTOCOLS = /^(javascript|data|file):/i

/** Private/LAN host — not reachable as a public URL from cellular. */
export function isPrivateLanHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true
  if (h.endsWith(".local")) return true
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}$/.test(h)) return true
  return false
}

/** User is connecting via HTTPS, tunnel, or public domain (not home Wi‑Fi). */
export function isPublicServerAddress(input: string | null | undefined): boolean {
  const raw = input?.trim()
  if (!raw) return false
  try {
    const url = /^https?:\/\//i.test(raw) ? new URL(raw) : new URL(`https://${raw.split("/")[0]}`)
    if (url.protocol === "https:") return true
    return !isPrivateLanHostname(url.hostname)
  } catch {
    const host = raw.replace(/^\/+|\/+$/g, "").split("/")[0]!.split(":")[0]!
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !isPrivateLanHostname(host)
    return true
  }
}

function proxiedApiCandidates(origin: string, pathname: string): string[] {
  const path = pathname.replace(/\/+$/, "") || ""
  const list: string[] = []
  if (path.startsWith("/api")) {
    list.push(stripApiSuffix(`${origin}${path}`))
  } else {
    list.push(normalizeApiBase(`${origin}/api`))
    if (path && path !== "/") {
      list.push(normalizeApiBase(`${origin}${path}/api`))
    }
  }
  return list
}

/** Sanitize user server input into discover API base candidates (…/api). */
export function buildApiBaseCandidates(input: string): string[] {
  const raw = input.trim()
  if (!raw || BLOCKED_PROTOCOLS.test(raw)) return []

  const candidates: string[] = []

  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw)
      if (BLOCKED_PROTOCOLS.test(url.protocol)) return []
      const host = url.hostname
      const port = url.port || (url.protocol === "https:" ? "443" : "80")
      const isLan = isPrivateLanHostname(host)

      if (url.protocol === "https:" || (!isLan && port !== "4000" && port !== "3000")) {
        candidates.push(...proxiedApiCandidates(url.origin, url.pathname))
        return [...new Set(candidates.filter(Boolean))]
      }

      if (port === "4000" || url.pathname.startsWith("/api")) {
        candidates.push(stripApiSuffix(url.origin + url.pathname))
      }
      if (port === "3000") {
        candidates.push(`${url.protocol}//${host}:4000/api`)
        candidates.push(stripApiSuffix(`${url.origin}/api`))
      }
      candidates.push(`${url.protocol}//${host}:4000/api`)
      if (port !== "3000") {
        candidates.push(`${url.protocol}//${host}:3000/api`)
      }
    } else {
      const hostPart = raw.replace(/^\/+|\/+$/g, "").split("/")[0]!
      const hostname = hostPart.split(":")[0]!
      const hasPort = hostPart.includes(":")
      const isLan = isPrivateLanHostname(hostname)

      if (!isLan && !hasPort) {
        candidates.push(`https://${hostPart}/api`)
        candidates.push(`http://${hostPart}/api`)
      } else if (!isLan && hasPort) {
        candidates.push(`http://${hostPart}/api`)
        candidates.push(`https://${hostPart}/api`)
      } else if (hasPort) {
        candidates.push(`http://${hostPart}/api`)
      } else {
        for (const port of ["4001", "4000", "3004", "3000"]) {
          candidates.push(`http://${hostPart}:${port}/api`)
        }
        candidates.push(`http://${hostPart}/api`)
      }
    }
  } catch {
    return []
  }

  return [...new Set(candidates.map(normalizeApiBase).filter(Boolean))]
}

function stripApiSuffix(base: string): string {
  return normalizeApiBase(base.replace(/\/api\/?$/i, "") + "/api")
}

export function isLoopbackApiBase(apiBase: string): boolean {
  try {
    return isLoopbackHost(new URL(apiBase).hostname)
  } catch {
    return false
  }
}

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return h === "localhost" || h === "127.0.0.1" || h === "::1"
}

/**
 * After discover, prefer the URL the phone actually used — not localhost from server config.
 */
export function resolveClientApiBaseUrl(
  workingCandidate: string,
  options?: {
    serverAdvertised?: string | null
    requestOrigin?: string | null
  },
): string {
  const working = normalizeApiBase(workingCandidate)
  if (!working) return working

  try {
    const workHost = new URL(working).hostname
    if (!isLoopbackHost(workHost)) {
      return working
    }
  } catch {
    return working
  }

  const { serverAdvertised, requestOrigin } = options ?? {}

  if (requestOrigin) {
    try {
      const origin = new URL(requestOrigin)
      if (!isLoopbackHost(origin.hostname)) {
        return normalizeApiBase(`${stripTrailingSlash(requestOrigin)}/api`)
      }
    } catch {
      /* use fallbacks */
    }
  }

  if (serverAdvertised) {
    try {
      const advertised = new URL(serverAdvertised)
      if (!isLoopbackHost(advertised.hostname)) {
        return normalizeApiBase(serverAdvertised)
      }
    } catch {
      /* use working */
    }
  }

  return working
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "")
}

export function deriveMobileServerUrlsFromApiBase(apiBaseUrl: string) {
  const apiBase = normalizeApiBase(apiBaseUrl)
  try {
    const url = new URL(apiBase)
    const isDirectApi = url.port === "4000"
    const isProxied =
      !isDirectApi &&
      (url.port === "" ||
        url.port === "443" ||
        url.port === "80" ||
        url.pathname.replace(/\/$/, "").endsWith("/api"))

    if (isProxied) {
      const origin =
        url.port && url.port !== "443" && url.port !== "80"
          ? url.origin
          : `${url.protocol}//${url.hostname}`
      return {
        apiBaseUrl: `${origin}/api`,
        socketUrl: origin,
        webUrl: origin,
      }
    }

    const protocol = url.protocol
    const host = url.hostname
    return {
      apiBaseUrl: apiBase,
      socketUrl: `${protocol}//${host}:4000`,
      webUrl: `${protocol}//${host}:3000`,
    }
  } catch {
    const root = apiBase.replace(/\/api\/?$/i, "")
    return { apiBaseUrl: apiBase, socketUrl: root, webUrl: root }
  }
}

export function normalizeApiBase(apiBase: string): string {
  try {
    const url = new URL(apiBase)
    if (BLOCKED_PROTOCOLS.test(url.protocol)) return ""
    const path = url.pathname.replace(/\/+$/, "")
    return `${url.origin}${path === "" || path === "/" ? "/api" : path.endsWith("/api") ? path : `${path}/api`}`
  } catch {
    return ""
  }
}

export function displayServerLabel(apiBaseUrl: string, instanceName?: string) {
  try {
    const { hostname, port } = new URL(apiBaseUrl)
    const host = port ? `${hostname}:${port}` : hostname
    return instanceName ? `${instanceName} · ${host}` : host
  } catch {
    return instanceName ?? apiBaseUrl
  }
}

/** Web UI origin for opening login / password flows from the mobile app. */
export function webAppUrlFromApiBase(apiBaseUrl: string, path = "/login"): string {
  try {
    const url = new URL(apiBaseUrl)
    const protocol = url.protocol
    const hostname = url.hostname
    let port = url.port
    if (port === "4000") port = "3000"
    const origin = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`
    const normalizedPath = path.startsWith("/") ? path : `/${path}`
    return `${origin}${normalizedPath}`
  } catch {
    return ""
  }
}
