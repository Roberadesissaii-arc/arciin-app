#!/usr/bin/env node
/**
 * Pre-production smoke test for arciin-app (standalone PWA).
 * Usage: node scripts/smoke-test-mobile.mjs [baseUrl]
 */

const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || "http://127.0.0.1:3002").replace(
  /\/$/,
  "",
)

const PAGES = [
  "/",
  "/sign-in",
  "/sign-in/forgot-password",
  "/setup",
  "/install",
  "/home",
  "/files",
  "/chat",
  "/database",
  "/database/app-data",
  "/models",
  "/jobs",
  "/events",
  "/activity",
  "/notifications",
  "/profile",
  "/profile/notifications",
  "/profile/passwords",
  "/profile/preferences",
  "/profile/storage",
  "/profile/security",
  "/profile/api-keys",
  "/profile/integrations",
  "/profile/remote-access",
  "/profile/edit",
  "/legal/privacy",
  "/legal/terms",
  "/manifest.webmanifest",
]

const API_PUBLIC = [
  { path: "/api/health", expect: 200 },
  { path: "/api/instance/status", expect: 200 },
  { path: "/api/setup-prefill", expect: 200 },
]

const API_AUTH_REQUIRED = [
  "/api/libraries",
  "/api/auth/me",
  "/api/settings/storage",
  "/api/settings/uploads",
  "/api/uploads",
  "/api/jobs",
  "/api/activity",
  "/api/models",
  "/api/chat/profiles",
]

const API_BAD_PATHS = [
  { path: "/api/arciin/health", note: "must NOT 404 via Fastify (rewrite exclusion)" },
]

async function fetchStatus(url, opts = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal, redirect: "manual" })
    const body = await res.text().catch(() => "")
    return { status: res.status, body: body.slice(0, 500), ok: res.ok }
  } catch (err) {
    return { status: 0, body: String(err?.message || err), ok: false }
  } finally {
    clearTimeout(timer)
  }
}

function pass(label) {
  return { label, ok: true }
}
function fail(label, detail) {
  return { label, ok: false, detail }
}

async function main() {
  const results = []
  console.log(`\nArciin mobile smoke test — ${BASE}\n`)

  for (const path of PAGES) {
    const r = await fetchStatus(`${BASE}${path}`)
    const ok = r.status >= 200 && r.status < 400
    results.push(
      ok
        ? pass(`PAGE ${path} → ${r.status}`)
        : fail(`PAGE ${path}`, `HTTP ${r.status}: ${r.body.slice(0, 120)}`),
    )
  }

  for (const { path, expect } of API_PUBLIC) {
    const r = await fetchStatus(`${BASE}${path}`)
    const ok = r.status === expect
    results.push(
      ok
        ? pass(`API ${path} → ${r.status}`)
        : fail(`API ${path}`, `expected ${expect}, got ${r.status}`),
    )
  }

  for (const path of API_AUTH_REQUIRED) {
    const r = await fetchStatus(`${BASE}${path}`)
    const ok = r.status === 401 || r.status === 403
    results.push(
      ok
        ? pass(`API ${path} (no auth) → ${r.status}`)
        : fail(`API ${path} (no auth)`, `expected 401/403, got ${r.status}`),
    )
  }

  for (const { path, note } of API_BAD_PATHS) {
    const r = await fetchStatus(`${BASE}${path}`, {
      headers: { "x-arciin-api-base": "http://127.0.0.1:4000/api" },
    })
    const ok = r.status === 200
    results.push(
      ok
        ? pass(`API ${path} → ${r.status} (${note})`)
        : fail(`API ${path}`, `${note} — got ${r.status}: ${r.body.slice(0, 80)}`),
    )
  }

  const wrongProxy = await fetchStatus(`${BASE}/api/arciin/libraries`)
  results.push(
    wrongProxy.status === 404
      ? fail(
          "REGRESSION /api/arciin/libraries",
          "404 — standalone should use /api/libraries not /api/arciin/*",
        )
      : pass(`REGRESSION /api/arciin/libraries → ${wrongProxy.status} (not bare 404 from Fastify)`),
  )

  const directHealth = await fetchStatus(`${BASE}/api/health`)
  if (directHealth.body.includes('"api":"online"')) {
    results.push(pass("API /api/health body contains api:online"))
  } else {
    results.push(fail("API /api/health body", directHealth.body.slice(0, 120)))
  }

  const failed = results.filter((r) => !r.ok)
  const passed = results.filter((r) => r.ok)

  console.log(`PASSED: ${passed.length}`)
  for (const r of passed) console.log(`  ✓ ${r.label}`)

  if (failed.length) {
    console.log(`\nFAILED: ${failed.length}`)
    for (const r of failed) console.log(`  ✗ ${r.label}${r.detail ? ` — ${r.detail}` : ""}`)
    process.exit(1)
  }

  console.log("\nAll automated smoke checks passed.\n")
}

main()
