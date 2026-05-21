import type { ActivitySummary } from "@/lib/types/models"

const NOTICES_KEY = "arciin_mobile_public_url_notices_v1"
const EVENT_NAME = "arciin:public-url-changed"

export type PublicUrlChangeNotice = {
  id: string
  title: string
  message: string
  previousUrl: string | null
  newUrl: string
  createdAt: string
  read: boolean
}

function hostLabel(url: string): string {
  const raw = url.trim().replace(/\/+$/, "")
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname
  } catch {
    return raw
  }
}

function loadNotices(): PublicUrlChangeNotice[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(NOTICES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PublicUrlChangeNotice[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistNotices(items: PublicUrlChangeNotice[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(NOTICES_KEY, JSON.stringify(items.slice(0, 40)))
  } catch {
    /* ignore quota */
  }
}

export function dispatchPublicUrlChangedEvent() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

export function subscribePublicUrlChanged(listener: () => void) {
  if (typeof window === "undefined") return () => {}
  const handler = () => listener()
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}

export function notifyMobilePublicUrlChanged(input: {
  previousUrl?: string | null
  newUrl: string
}) {
  const newUrl = input.newUrl.trim().replace(/\/+$/, "")
  if (!newUrl) return

  const previousUrl = input.previousUrl?.trim().replace(/\/+$/, "") ?? null
  if (previousUrl && previousUrl === newUrl) return

  const newHost = hostLabel(newUrl)
  const title = "Public URL changed"
  const message = previousUrl
    ? `Your server address changed after a restart (${hostLabel(previousUrl)} → ${newHost}). The app will reconnect on Wi‑Fi.`
    : `Your public address is now ${newHost}.`

  const notice: PublicUrlChangeNotice = {
    id: `url-${Date.now()}`,
    title,
    message,
    previousUrl,
    newUrl,
    createdAt: new Date().toISOString(),
    read: false,
  }

  const items = [notice, ...loadNotices().filter((n) => n.newUrl !== newUrl)].slice(0, 40)
  persistNotices(items)
  dispatchPublicUrlChangedEvent()

  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification(title, { body: message, tag: "arciin-public-url-changed" })
      } catch {
        /* ignore */
      }
    } else if (Notification.permission === "default") {
      void Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          try {
            new Notification(title, { body: message, tag: "arciin-public-url-changed" })
          } catch {
            /* ignore */
          }
        }
      })
    }
  }
}

export function listPublicUrlChangeNotices(): PublicUrlChangeNotice[] {
  return loadNotices()
}

export function countUnreadPublicUrlNotices(lastSeenIso: string | null): number {
  const items = loadNotices()
  if (!items.length) return 0
  if (!lastSeenIso) return items.filter((n) => !n.read).length
  const lastSeen = Date.parse(lastSeenIso)
  if (Number.isNaN(lastSeen)) return items.filter((n) => !n.read).length
  return items.filter((n) => !n.read && Date.parse(n.createdAt) > lastSeen).length
}

export function markPublicUrlNoticesRead() {
  const items = loadNotices().map((n) => ({ ...n, read: true }))
  persistNotices(items)
  dispatchPublicUrlChangedEvent()
}

export function publicUrlNoticeToActivity(notice: PublicUrlChangeNotice): ActivitySummary {
  return {
    id: notice.id,
    type: "remote.public_url_changed",
    title: notice.title,
    message: notice.message,
    entityType: "remote",
    createdAt: notice.createdAt,
  }
}

export function mergeActivityWithPublicUrlNotices(
  activity: ActivitySummary[],
): ActivitySummary[] {
  if (activity.some((a) => a.type === "remote.public_url_changed")) {
    return activity
  }
  const notices = loadNotices().map(publicUrlNoticeToActivity)
  const seen = new Set(activity.map((a) => a.id))
  const merged = [...notices.filter((n) => !seen.has(n.id)), ...activity]
  merged.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  return merged
}
