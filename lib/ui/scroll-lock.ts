/** Lock document scroll (iOS PWA) while preserving scroll position on unlock. */
export function lockBodyScroll(): () => void {
  const html = document.documentElement
  const body = document.body
  const scrollY = window.scrollY
  const prev = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyTouchAction: body.style.touchAction,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
  }

  html.style.overflow = "hidden"
  body.style.overflow = "hidden"
  body.style.touchAction = "none"

  const blockTouch = (e: TouchEvent) => {
    const target = e.target
    if (target instanceof Element && target.closest("[data-scroll-lock-allow]")) return
    e.preventDefault()
  }
  document.addEventListener("touchmove", blockTouch, { passive: false })

  return () => {
    html.style.overflow = prev.htmlOverflow
    body.style.overflow = prev.bodyOverflow
    body.style.touchAction = prev.bodyTouchAction
    body.style.position = prev.bodyPosition
    body.style.top = prev.bodyTop
    body.style.left = prev.bodyLeft
    body.style.right = prev.bodyRight
    body.style.width = prev.bodyWidth
    document.removeEventListener("touchmove", blockTouch)
    resetMobileViewport(scrollY)
  }
}

/** Blur inputs and restore scroll after sheets / keyboard on iOS. */
export function resetMobileViewport(scrollY = window.scrollY) {
  if (typeof window === "undefined") return

  const active = document.activeElement
  if (active instanceof HTMLElement) {
    active.blur()
  }

  const body = document.body
  body.style.removeProperty("position")
  body.style.removeProperty("top")
  body.style.removeProperty("left")
  body.style.removeProperty("right")
  body.style.removeProperty("width")

  const restore = () => {
    window.scrollTo(0, scrollY)
  }
  restore()
  requestAnimationFrame(restore)
  window.setTimeout(restore, 50)
}

/** Repeated viewport reset while the iOS keyboard animates closed (sheets, folder create, etc.). */
export function forceResetMobileViewport(scrollY = window.scrollY) {
  resetMobileViewport(scrollY)
  const run = () => resetMobileViewport(scrollY)
  requestAnimationFrame(run)
  window.setTimeout(run, 80)
  window.setTimeout(run, 150)
  window.setTimeout(run, 320)
}
