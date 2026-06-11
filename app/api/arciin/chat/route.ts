import { NextResponse } from "next/server"

import { validateProxyApiBase } from "@/lib/security/validate-proxy-upstream"

const API_BASE_HEADER = "x-arciin-api-base"

/** Abort if the upstream does not answer headers in time — never cuts an open stream. */
const CONNECT_TIMEOUT_MS = 20_000

/**
 * Same-origin SSE proxy for the mobile PWA.
 * Avoids browser CORS failures on POST /chat streaming from Vercel → self-hosted Arciin.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization")
  const apiBase = request.headers.get(API_BASE_HEADER)?.replace(/\/+$/, "")

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
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
