"use client"

/**
 * Copy text without relying solely on navigator.clipboard, which requires a
 * secure context (HTTPS or localhost) and silently fails on a self-hosted
 * instance reached over plain HTTP by LAN IP — the common case before a
 * reverse proxy/TLS is set up.
 */
function copyWithExecCommand(text: string): boolean {
  if (typeof document === "undefined") {
    return false
  }

  const el = document.createElement("textarea")
  el.value = text
  el.setAttribute("readonly", "")
  el.style.cssText =
    "position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:none;outline:none;box-shadow:none;background:transparent"
  document.body.appendChild(el)
  el.focus()
  el.select()
  el.setSelectionRange(0, text.length)

  let ok = false
  try {
    ok = document.execCommand("copy")
  } finally {
    document.body.removeChild(el)
  }

  return ok
}

/** Copy immediately inside a tap/click handler — tries the silent paths first. */
export async function copyTextWithFallback(text: string): Promise<boolean> {
  if (!text) return false

  if (copyWithExecCommand(text)) {
    return true
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through
    }
  }

  return false
}

/**
 * Last resort when both the silent paths fail — shows the value in a native
 * prompt so the user can still copy it by hand instead of hitting a dead end.
 */
export async function copyTextOrPrompt(text: string, promptLabel = "Copy this:"): Promise<boolean> {
  if (await copyTextWithFallback(text)) {
    return true
  }
  if (typeof window !== "undefined") {
    window.prompt(promptLabel, text)
    return true
  }
  return false
}
