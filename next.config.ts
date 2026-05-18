import type { NextConfig } from "next"

/**
 * Phone/tablet access during `pnpm dev --hostname 0.0.0.0` uses your LAN IP as the
 * browser origin. Next.js blocks dev fonts/HMR from other origins unless listed here.
 *
 * Set in .env.local (comma-separated):
 *   ARCIIN_MOBILE_DEV_ORIGINS=192.168.4.22
 */
const mobileDevOrigins = (process.env.ARCIIN_MOBILE_DEV_ORIGINS ?? "192.168.4.22")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", ...mobileDevOrigins],
}

export default nextConfig
