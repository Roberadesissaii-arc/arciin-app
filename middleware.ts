import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/** Preserve the PWA Host when Next rewrites /api to the Fastify backend. */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const host = request.headers.get("host")
  if (host) {
    requestHeaders.set("x-forwarded-host", host)
  }
  const proto = request.nextUrl.protocol.replace(":", "")
  if (proto) {
    requestHeaders.set("x-forwarded-proto", proto)
  }
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/api/:path*", "/socket.io/:path*"],
}
