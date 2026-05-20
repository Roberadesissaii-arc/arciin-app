import { NextResponse } from "next/server"

import { ARCIIN_API_BASE_HEADER } from "@/lib/api/arciin-proxy"

const API_BASE_HEADER = ARCIIN_API_BASE_HEADER

/** Same-origin proxy so the PWA can load avatars without cross-origin fetch issues. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  const apiBase = request.headers.get(API_BASE_HEADER)?.replace(/\/+$/, "")

  if (!auth?.startsWith("Bearer ") || !apiBase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")?.trim()
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const upstream = `${apiBase}/auth/users/${encodeURIComponent(userId)}/avatar`
  const v = searchParams.get("v")
  const url = v ? `${upstream}?v=${encodeURIComponent(v)}` : upstream

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Authorization: auth },
      cache: "no-store",
    })
  } catch {
    return NextResponse.json({ error: "Upstream unreachable" }, { status: 502 })
  }

  if (!res.ok) {
    return new NextResponse(null, { status: res.status })
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg"
  const body = await res.arrayBuffer()

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300",
    },
  })
}
