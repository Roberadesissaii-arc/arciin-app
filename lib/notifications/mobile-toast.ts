const EVENT_NAME = "arciin:mobile-toast"

export type MobileToastVariant = "success" | "error" | "warning" | "info"

export type MobileToastNotice = {
  id: string
  title: string
  description?: string
  variant: MobileToastVariant
}

/**
 * Minimal global toast bus for mobile — the app has no toast library (unlike
 * desktop's Sonner setup). MobileToastHost (mounted once in app/layout.tsx)
 * subscribes and renders a floating card regardless of which page is open.
 */
export const mobileToast = {
  show(input: { title: string; description?: string; variant?: MobileToastVariant }) {
    if (typeof window === "undefined") return
    const notice: MobileToastNotice = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      description: input.description,
      variant: input.variant ?? "info",
    }
    window.dispatchEvent(new CustomEvent<MobileToastNotice>(EVENT_NAME, { detail: notice }))
  },
  success(title: string, description?: string) {
    mobileToast.show({ title, description, variant: "success" })
  },
  error(title: string, description?: string) {
    mobileToast.show({ title, description, variant: "error" })
  },
  warning(title: string, description?: string) {
    mobileToast.show({ title, description, variant: "warning" })
  },
  info(title: string, description?: string) {
    mobileToast.show({ title, description, variant: "info" })
  },
}

export function subscribeMobileToast(listener: (notice: MobileToastNotice) => void) {
  if (typeof window === "undefined") return () => {}
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<MobileToastNotice>).detail
    if (detail?.id) listener(detail)
  }
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}
