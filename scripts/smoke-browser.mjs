#!/usr/bin/env node
/**
 * Mobile viewport browser smoke (Playwright).
 * Optional: SMOKE_EMAIL + SMOKE_PASSWORD for signed-in checks.
 */
import { chromium, devices } from "playwright"

const BASE = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3002").replace(/\/$/, "")
const EMAIL = process.env.SMOKE_EMAIL
const PASSWORD = process.env.SMOKE_PASSWORD

const PUBLIC_ROUTES = [
  { path: "/sign-in", mustContain: "Sign in" },
  { path: "/legal/privacy", mustContain: "Privacy" },
  { path: "/legal/terms", mustContain: "Terms" },
]

const SHELL_ROUTES = [
  "/home",
  "/files",
  "/chat",
  "/database",
  "/models",
  "/profile",
  "/jobs",
  "/events",
  "/activity",
  "/notifications",
]

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "en-US",
  })
  const page = await context.newPage()
  const results = []

  for (const { path, mustContain } of PUBLIC_ROUTES) {
    try {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20000 })
      const text = await page.locator("body").innerText()
      const ok = res?.ok() && text.includes(mustContain)
      results.push({ path, ok, detail: ok ? `contains "${mustContain}"` : `missing "${mustContain}"` })
    } catch (err) {
      results.push({ path, ok: false, detail: String(err?.message || err) })
    }
  }

  if (EMAIL && PASSWORD) {
    await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" })
    await page.locator('input[type="email"], input[name="email"], #email').first().fill(EMAIL)
    await page.locator('input[type="password"]').first().fill(PASSWORD)
    await page.locator('button[type="submit"]').first().click()
    await page.waitForURL(/\/home/, { timeout: 15000 }).catch(() => {})

    if (page.url().includes("/home")) {
      for (const path of SHELL_ROUTES) {
        try {
          await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20000 })
          await page.waitForTimeout(800)
          const text = (await page.locator("body").innerText()).trim()
          const ok = text.length > 40 && !/Sign in/i.test(text.slice(0, 200))
          results.push({
            path: `${path} (signed in)`,
            ok,
            detail: ok ? `${text.length} chars rendered` : "blank or sign-in redirect",
          })
        } catch (err) {
          results.push({ path: `${path} (signed in)`, ok: false, detail: String(err?.message || err) })
        }
      }
    } else {
      results.push({ path: "sign-in", ok: false, detail: "login failed — set SMOKE_EMAIL/SMOKE_PASSWORD" })
    }
  } else {
    results.push({
      path: "signed-in routes",
      ok: true,
      detail: "skipped — set SMOKE_EMAIL and SMOKE_PASSWORD for full UI walkthrough",
    })
  }

  await browser.close()

  console.log(`\nBrowser smoke (iPhone 13 viewport) — ${BASE}\n`)
  const failed = results.filter((r) => !r.ok)
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.path} — ${r.detail}`)
  }
  if (failed.length) process.exit(1)
  console.log("\nBrowser smoke passed.\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
