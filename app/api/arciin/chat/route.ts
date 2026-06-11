import { NextResponse } from "next/server"

import { validateProxyApiBase } from "@/lib/security/validate-proxy-upstream"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import { isStandaloneApp } from "@/lib/standalone/config"

const API_BASE_HEADER = "x-arciin-api-base"

// Stream the reply token-by-token — never let the platform cache or buffer it.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Abort if the upstream does not answer headers in time — never cuts an open stream. */
const CONNECT_TIMEOUT_MS = 20_000

/**
 * Same-origin SSE proxy for the mobile PWA.
 * Avoids browser CORS failures on POST /chat streaming from Vercel → self-hosted Arciin.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization")
  let apiBase = request.headers.get(API_BASE_HEADER)?.replace(/\/+$/, "")

  // Standalone co-located: the browser sends no override header — resolve the
  // server-side API base (ARCIIN_API_URL) so chat streams through this handler
  // (which sets anti-buffering headers) instead of the bare /api rewrite.
  if (!apiBase && isStandaloneApp()) {
    apiBase = getStandaloneApiBaseUrl().replace(/\/+$/, "")
  }

  if (!auth?.startsWith("Bearer ") || !apiBase) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing session or server address." } },
      { status: 401 },
    )
  }

  const validatedBase = validateProxyApiBase(apiBase)
  if (!validatedBase.ok) {
    return NextResponse.json(
      { error: { code: validatedBase.code, message: validatedBase.message } },
      { status: validatedBase.code === "BAD_REQUEST" ? 400 : 403 },
    )
  }

  const body = await request.text()
  const upstream = `${validatedBase.normalizedBase}/chat`

  const controller = new AbortController()
  const connectTimer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(upstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: auth,
      },
      body,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    })
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNREACHABLE",
          message: "Could not reach your Arciin server. Check the URL or tunnel.",
        },
      },
      { status: 502 },
    )
  } finally {
    clearTimeout(connectTimer)
  }

  if (res.status >= 300 && res.status < 400) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_REDIRECT", message: "Upstream redirect is not allowed." } },
      { status: 502 },
    )
  }

  if (!res.ok) {
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    })
  }

  if (!res.body) {
    return NextResponse.json(
      { error: { code: "INVALID_RESPONSE", message: "Chat stream returned no body." } },
      { status: 502 },
    )
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "text/event-stream",
      // no-transform stops gzip (which buffers chunks); X-Accel-Buffering stops
      // reverse-proxy buffering — together they keep the stream incremental.
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  })
}
