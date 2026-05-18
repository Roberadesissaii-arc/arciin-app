const BLOCKED_PROTOCOLS = /^(javascript|data|file):/i

/** Sanitize user server input into discover API base candidates (…/api). */
export function buildApiBaseCandidates(input: string): string[] {
  const raw = input.trim()
  if (!raw || BLOCKED_PROTOCOLS.test(raw)) return []

  const candidates: string[] = []

  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw)
      if (BLOCKED_PROTOCOLS.test(url.protocol)) return []
      const port = url.port || (url.protocol === "https:" ? "443" : "80")
      const host = url.hostname
      if (port === "4000" || url.pathname.startsWith("/api")) {
        candidates.push(stripApiSuffix(url.origin + url.pathname))
      }
      if (port === "3000") {
        candidates.push(`${url.protocol}//${host}:4000/api`)
        candidates.push(`${url.protocol}//${host}:3000/api`)
      }
      candidates.push(`${url.protocol}//${host}:4000/api`)
      candidates.push(`${url.protocol}//${host}:3000/api`)
    } else {
      const host = raw.replace(/^\/+|\/+$/g, "").split("/")[0]!
      const hasPort = host.includes(":")
      if (hasPort) {
        candidates.push(`http://${host}/api`)
      } else {
        candidates.push(`http://${host}:4000/api`)
        candidates.push(`http://${host}:3000/api`)
        candidates.push(`http://${host}/api`)
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
  const { serverAdvertised, requestOrigin } = options ?? {}

  if (serverAdvertised) {
    try {
      const advertised = new URL(serverAdvertised)
      if (!isLoopbackHost(advertised.hostname)) {
        return normalizeApiBase(serverAdvertised)
      }
    } catch {
      /* use fallbacks */
    }
  }

  if (requestOrigin) {
    try {
      const origin = new URL(requestOrigin)
      if (!isLoopbackHost(origin.hostname)) {
        const { protocol, hostname } = origin
        if (workingCandidate.includes(":4000")) {
          return normalizeApiBase(`${protocol}//${hostname}:4000`)
        }
        return normalizeApiBase(origin.origin)
      }
    } catch {
      /* use candidate */
    }
  }

  return normalizeApiBase(workingCandidate)
}

export function deriveMobileServerUrlsFromApiBase(apiBaseUrl: string) {
  const apiBase = normalizeApiBase(apiBaseUrl)
  try {
    const url = new URL(apiBase)
    const protocol = url.protocol
    const host = url.hostname
    const apiPort = url.port || (protocol === "https:" ? "443" : "4000")
    const webPort = apiPort === "4000" ? "3000" : apiPort
    return {
      apiBaseUrl: apiBase,
      socketUrl: `${protocol}//${host}:${apiPort}`,
      webUrl: `${protocol}//${host}:${webPort}`,
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
