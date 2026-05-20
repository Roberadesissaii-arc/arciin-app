import { NextResponse } from "next/server"

import { ARCIIN_API_BASE_HEADER } from "@/lib/api/arciin-proxy"

type RouteContext = { params: Promise<{ path: string[] }> }

async function proxyUpstream(request: Request, context: RouteContext) {
  const auth = request.headers.get("authorization")
  const apiBase = request.headers.get(ARCIIN_API_BASE_HEADER)?.replace(/\/+$/, "")

  if (!auth?.startsWith("Bearer ") || !apiBase) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing session or server address." } },
      { status: 401 },
    )
  }

  const { path } = await context.params
  const subPath = path.join("/")
  const search = new URL(request.url).search
  const upstream = `${apiBase}/${subPath}${search}`

  const method = request.method
  const hasBody = method !== "GET" && method !== "HEAD"
  const requestBody = hasBody ? await request.text() : undefined

  let res: Response
  try {
    res = await fetch(upstream, {
      method,
      headers: {
        Authorization: auth,
        Accept: request.headers.get("accept") ?? "application/json",
        ...(hasBody && requestBody
          ? {
              "Content-Type":
                request.headers.get("content-type") ?? "application/json",
            }
          : {}),
      },
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

  const responseBody = await res.arrayBuffer()
  return new NextResponse(responseBody, {
    status: res.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": res.headers.get("cache-control") ?? "private, max-age=300",
    },
  })
}

export const GET = proxyUpstream
export const POST = proxyUpstream
export const DELETE = proxyUpstream
export const PATCH = proxyUpstream
export const PUT = proxyUpstream
