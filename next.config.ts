import { config as loadEnv } from "dotenv"
import type { NextConfig } from "next"

// Ensure install.sh / PM2 .env.local is visible when building and at `next start`.
loadEnv({ path: ".env.local" })
loadEnv({ path: ".env" })

const apiUrl =
  process.env.ARCIIN_API_URL ||
  `http://127.0.0.1:${process.env.API_PORT || "4000"}`

const maxUploadMb = Number(process.env.MAX_UPLOAD_SIZE_MB || String(20 * 1024))
const proxyMaxBodyBytes =
  Number.isFinite(maxUploadMb) && maxUploadMb > 0
    ? maxUploadMb * 1024 * 1024
    : 10240 * 1024 * 1024

function resolveAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(["localhost", "127.0.0.1", "*.trycloudflare.com"])
  const candidates = [
    process.env.ARCIIN_PUBLIC_URL,
    process.env.NEXT_PUBLIC_ARCIIN_PUBLIC_URL,
    process.env.ARCIIN_LAN_ORIGINS,
    process.env.ARCIIN_MOBILE_DEV_ORIGINS,
  ]
  for (const raw of candidates) {
    if (!raw?.trim()) continue
    for (const part of raw.split(",")) {
      const value = part.trim()
      if (!value) continue
      try {
        const hostname = /^https?:\/\//i.test(value)
          ? new URL(value).hostname
          : value.replace(/:\d+$/, "")
        if (hostname) hosts.add(hostname)
      } catch {
        // ignore invalid URL
      }
    }
  }
  return [...hosts]
}

const nextConfig: NextConfig = {
  /** Gzip buffers SSE chunks — chat replies appear all at once without this. */
  compress: false,
  allowedDevOrigins: resolveAllowedDevOrigins(),
  /** Hide Next.js 16 devtools chip — avoids dev-only pointer-capture console noise on touch devices. */
  devIndicators: false,
  poweredByHeader: false,
  /** Socket.IO polling uses `/socket.io/?EIO=…` — do not 308-strip the slash before the query. */
  skipTrailingSlashRedirect: true,
  experimental: {
    // Must match API MAX_UPLOAD_SIZE_MB — uploads via /api rewrite buffer in Next.
    proxyClientMaxBodySize: proxyMaxBodyBytes,
  },
  /**
   * Keep the chat SSE stream un-buffered end to end. `X-Accel-Buffering: no`
   * stops nginx/Cloudflare-style proxies from buffering, and `no-transform`
   * stops both Next's own gzip (the `compression` layer skips no-transform
   * responses) and Cloudflare from re-compressing — gzip buffers chunks, which
   * makes the reply appear all at once. Applies to the standalone rewrite path
   * (/api/chat) and the hosted-companion route (/api/arciin/chat).
   */
  async headers() {
    const noBuffer = [
      { key: "X-Accel-Buffering", value: "no" },
      { key: "Cache-Control", value: "no-cache, no-transform" },
    ]
    return [
      { source: "/api/chat", headers: noBuffer },
      { source: "/api/arciin/chat", headers: noBuffer },
    ]
  },
  async rewrites() {
    const upstream = apiUrl.replace(/\/$/, "")
    return [
      // App Router owns /api/arciin/* (hosted companion proxy). Do not forward to Fastify.
      {
        source: "/api/:path((?!arciin/).*)",
        destination: `${upstream}/api/:path`,
      },
      {
        source: "/socket.io",
        destination: `${apiUrl.replace(/\/$/, "")}/socket.io/`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiUrl.replace(/\/$/, "")}/socket.io/:path*`,
      },
    ]
  },
}

export default nextConfig
