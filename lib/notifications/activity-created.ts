const EVENT_NAME = "arciin:activity-created"

export type ActivityCreatedNotice = {
  type: string
  title: string
  message?: string
  sentiment?: string
}

export function dispatchActivityCreatedEvent(notice: ActivityCreatedNotice) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: notice }))
}

export function subscribeActivityCreated(listener: (notice: ActivityCreatedNotice) => void) {
  if (typeof window === "undefined") return () => {}
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<ActivityCreatedNotice>).detail
    if (detail?.type) listener(detail)
  }
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}

function showOsNotification(title: string, message?: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return

  const options: NotificationOptions = {
    body: message,
    tag: tag ?? "arciin-activity",
  }

  if (Notification.permission === "granted") {
    try {
      new Notification(title, options)
    } catch {
      /* ignore */
    }
    return
  }

  if (Notification.permission === "default") {
    void Notification.requestPermission().then((perm) => {
      if (perm !== "granted") return
      try {
        new Notification(title, options)
      } catch {
        /* ignore */
      }
    })
  }
}

export function notifyMobileActivityCreated(notice: ActivityCreatedNotice) {
  dispatchActivityCreatedEvent(notice)

  if (notice.type === "share.feedback") {
    showOsNotification(notice.title, notice.message, `arciin-share-feedback-${notice.sentiment ?? "unknown"}`)
  }
}
