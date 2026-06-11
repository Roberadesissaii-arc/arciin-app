import { NextResponse } from "next/server"

import { getInstanceStatus } from "@/lib/api/instance"

/**
 * Server-only prefill for first-run setup — reads ARCIIN_SETUP_TOKEN from .env.local
 * (synced from ../arciin/.env by install.sh). Never exposed as NEXT_PUBLIC_*.
 */
export async function GET() {
  const fromEnv = process.env.ARCIIN_SETUP_TOKEN?.trim()

  try {
    const status = await getInstanceStatus()
    if (status.initialized) {
      return NextResponse.json({ token: null })
    }
  } catch {
    // API unreachable — claim cannot proceed anyway, and the instance may already
    // be initialized. Never reveal the token without a confirmed uninitialized status.
    return NextResponse.json({ token: null })
  }

  if (fromEnv) {
    return NextResponse.json({ token: fromEnv })
  }

  return NextResponse.json({ token: null })
}
