import { NextResponse } from "next/server"

import { ARCIIN_API_BASE_HEADER } from "@/lib/api/arciin-proxy"

type RouteContext = { params: Promise<{ path: string[] }> }

const PUBLIC_API_PREFIXES = [
  "health",
  "mobile/discover",
  "mobile/pair/verify",
  "mobile/login",
  "mobile/pair",
] as const

function isPublicProxyPath(subPath: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => subPath === prefix || subPath.startsWith(`${prefix}/`),
  )
}

async function proxyUpstream(request: Request, context: RouteContext) {
  const auth = request.headers.get("authorization")
  const apiBase = request.headers.get(ARCIIN_API_BASE_HEADER)?.replace(/\/+$/, "")
  const { path } = await context.params
  const subPath = path.join("/")
  const isPublic = isPublicProxyPath(subPath)

  const reqUrl = new URL(request.url)
  const search = reqUrl.search
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

  const upstream = `${resolvedApiBase}/${subPath}${search}`

  const method = request.method
  const hasBody = method !== "GET" && method !== "HEAD"
  const requestBody = hasBody ? await request.text() : undefined

  const acceptHeader = request.headers.get("accept")
  const upstreamHeaders: Record<string, string> = {
    Accept: acceptHeader ?? "application/json",
  }
  if (bearer) {
    upstreamHeaders.Authorization = bearer
  }
  if (hasBody && requestBody) {
    upstreamHeaders["Content-Type"] =
      request.headers.get("content-type") ?? "application/json"
  }
  // Forward Range header so video/audio seeking works through the proxy
  const rangeHeader = request.headers.get("range")
  if (rangeHeader) {
    upstreamHeaders.Range = rangeHeader
  }

  let res: Response
  try {
    res = await fetch(upstream, {
      method,
      headers: upstreamHeaders,
      body: hasBody && requestBody ? requestBody : undefined,
      cache: "no-store",
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

  const contentType = res.headers.get("content-type") ?? "application/json"
  const isJson = contentType.includes("application/json")

  if (isJson) {
    const text = await res.text()
    return new NextResponse(text || null, {
      status: res.status,
      headers: { "Content-Type": contentType },
    })
  }

  // Stream binary responses (video, audio, images) — never buffer the whole body.
  // Forward Range-related headers so the browser's media engine can seek.
  const binaryHeaders: Record<string, string> = {
    "Content-Type": contentType,
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
