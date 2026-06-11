import { NextResponse } from "next/server"

import { ARCIIN_API_BASE_HEADER } from "@/lib/api/arciin-proxy"
import {
  buildUpstreamSearch,
  isCoLocatedProxyTarget,
  validateProxyApiBase,
} from "@/lib/security/validate-proxy-upstream"

type RouteContext = { params: Promise<{ path: string[] }> }

const ALWAYS_PUBLIC_PREFIXES = [
  "health",
  "mobile/discover",
  "mobile/pair/verify",
  "mobile/login",
  "mobile/pair",
  "instance/status",
  "auth/login",
] as const

/** Pre-auth setup/recovery — allowed on hosted companion (Vercel) or co-located LAN only. */
const COLOCATED_OR_HOSTED_PUBLIC_PREFIXES = [
  "instance/storage-discovery",
  "instance/storage-prepare",
  "instance/claim",
  "auth/recovery/lookup",
  "auth/recovery/reset",
] as const

function matchesPrefix(subPath: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => subPath === prefix || subPath.startsWith(`${prefix}/`),
  )
}

function isPublicProxyPath(subPath: string): boolean {
  return (
    matchesPrefix(subPath, ALWAYS_PUBLIC_PREFIXES) ||
    matchesPrefix(subPath, COLOCATED_OR_HOSTED_PUBLIC_PREFIXES)
  )
}

function isSensitivePublicProxyPath(subPath: string): boolean {
  return matchesPrefix(subPath, COLOCATED_OR_HOSTED_PUBLIC_PREFIXES)
}

async function proxyUpstream(request: Request, context: RouteContext) {
  const auth = request.headers.get("authorization")
  const apiBase = request.headers.get(ARCIIN_API_BASE_HEADER)?.replace(/\/+$/, "")
  const { path } = await context.params
  const subPath = path.join("/")
  const isPublic = isPublicProxyPath(subPath)

  const reqUrl = new URL(request.url)
  const searchParams = reqUrl.searchParams
  const queryToken = searchParams.get("access_token")?.trim() ?? ""

  // <video>/<audio> elements can't send custom headers — accept api_base from query param
  let resolvedApiBase = apiBase
  if (!resolvedApiBase) {
    const encoded = searchParams.get("api_base")
    if (encoded) {
      try { resolvedApiBase = atob(encoded).replace(/\/+$/, "") } catch { /* ignore */ }
    }
  }

  if (!resolvedApiBase) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Missing server address." } },
      { status: 400 },
    )
  }

  const validatedBase = validateProxyApiBase(resolvedApiBase)
  if (!validatedBase.ok) {
    return NextResponse.json(
      { error: { code: validatedBase.code, message: validatedBase.message } },
      { status: validatedBase.code === "BAD_REQUEST" ? 400 : 403 },
    )
  }
  resolvedApiBase = validatedBase.normalizedBase

  let bearer = auth?.startsWith("Bearer ") ? auth : null
  if (!bearer && queryToken && !queryToken.startsWith("arc_")) {
    bearer = `Bearer ${queryToken}`
  }

  if (!isPublic && !bearer) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing session or server address." } },
      { status: 401 },
    )
  }

  if (
    isPublic &&
    !bearer &&
    isSensitivePublicProxyPath(subPath) &&
    !process.env.VERCEL &&
    !isCoLocatedProxyTarget(resolvedApiBase)
  ) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Unauthenticated proxy requests must target this instance's API.",
        },
      },
      { status: 403 },
    )
  }

  const upstream = `${resolvedApiBase}/${subPath}${buildUpstreamSearch(searchParams)}`

  const method = request.method
  const hasBody = method !== "GET" && method !== "HEAD"
  const contentType = request.headers.get("content-type") ?? ""
  const isMultipart = contentType.includes("multipart/form-data")
  const isUploadPath = subPath === "uploads" || subPath.startsWith("uploads/")

  const isDownloadPath = /\/download$/.test(subPath)
  const acceptHeader = request.headers.get("accept")
  const upstreamHeaders: Record<string, string> = {
    Accept: acceptHeader ?? (isDownloadPath ? "*/*" : "application/json"),
  }
  if (bearer) {
    upstreamHeaders.Authorization = bearer
  }

  let requestBody: BodyInit | undefined
  if (hasBody) {
    if (isMultipart) {
      requestBody = await request.formData()
    } else {
      const text = await request.text()
      requestBody = text.length > 0 ? text : undefined
      if (requestBody) {
        upstreamHeaders["Content-Type"] = contentType || "application/json"
      }
    }
  }

  // Forward Range header so video/audio seeking works through the proxy
  const rangeHeader = request.headers.get("range")
  if (rangeHeader) {
    upstreamHeaders.Range = rangeHeader
  }

  const timeoutMs = isUploadPath ? 3_600_000 : isDownloadPath ? 600_000 : 15_000

  let res: Response
  try {
    res = await fetch(upstream, {
      method,
      headers: upstreamHeaders,
      body: requestBody,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNREACHABLE",
          message: "Could not reach your Arciin server.",
        },
      },
      { status: 502 },
    )
  }

  if (res.status >= 300 && res.status < 400) {
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_REDIRECT",
          message: "Upstream redirect is not allowed.",
        },
      },
      { status: 502 },
    )
  }

  const responseContentType = res.headers.get("content-type") ?? "application/json"
  const isJson = responseContentType.includes("application/json")

  if (isJson) {
    const text = await res.text()
    return new NextResponse(text || null, {
      status: res.status,
      headers: { "Content-Type": responseContentType },
    })
  }

  // Stream binary responses (video, audio, images) — never buffer the whole body.
  // Forward Range-related headers so the browser's media engine can seek.
  const binaryHeaders: Record<string, string> = {
    "Content-Type": responseContentType,
    "Cache-Control": res.headers.get("cache-control") ?? "private, max-age=300",
  }
  for (const h of ["Content-Range", "Accept-Ranges", "Content-Length", "Content-Disposition"]) {
    const v = res.headers.get(h)
    if (v) binaryHeaders[h] = v
  }
  return new NextResponse(res.body, {
    status: res.status,
    headers: binaryHeaders,
  })
}

export const GET = proxyUpstream
export const POST = proxyUpstream
export const DELETE = proxyUpstream
export const PATCH = proxyUpstream
export const PUT = proxyUpstream

/**
 * Vercel serverless function execution cap. Hobby plan allows a max of 300s, so
 * cap here for the hosted-companion deploy. This is Vercel-only — on a self-hosted
 * `next start` it is ignored, and large uploads are bounded by the route's own
 * upstream timeout (AbortSignal.timeout above), not this value.
 */
export const maxDuration = 300
