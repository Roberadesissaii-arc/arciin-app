import { fetchApi } from "@/lib/api/client"
import {
  countUnreadPublicUrlNotices,
  markPublicUrlNoticesRead,
  mergeActivityWithPublicUrlNotices,
} from "@/lib/notifications/public-url-changed"
import type { MobileConnection } from "@/lib/types/api"
import type { ActivitySummary } from "@/lib/types/models"

const LAST_SEEN_KEY = "arciin_mobile_notifications_last_seen_v1"

export function getNotificationsLastSeen(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(LAST_SEEN_KEY)
}

export function markNotificationsSeen(iso = new Date().toISOString()) {
  if (typeof window === "undefined") return
  localStorage.setItem(LAST_SEEN_KEY, iso)
  markPublicUrlNoticesRead()
}

export async function fetchRecentActivity(
  connection: MobileConnection,
  signal?: AbortSignal,
) {
  const activity = await fetchApi<ActivitySummary[]>("/activity", { connection, signal })
  return mergeActivityWithPublicUrlNotices(activity)
}

export function countUnreadActivity(
  items: ActivitySummary[],
  lastSeenIso: string | null,
): number {
  const hasServerUrlEvent = items.some((a) => a.type === "remote.public_url_changed")
  const urlUnread = hasServerUrlEvent ? 0 : countUnreadPublicUrlNotices(lastSeenIso)
  if (!lastSeenIso) {
    const activityUnread = items.length > 0 ? Math.min(items.length, 99) : 0
    return Math.min(activityUnread + urlUnread, 99)
  }
  const lastSeen = Date.parse(lastSeenIso)
  if (Number.isNaN(lastSeen)) {
    return Math.min((items.length > 0 ? 1 : 0) + urlUnread, 99)
  }
  const activityUnread = items.filter((item) => Date.parse(item.createdAt) > lastSeen).length
  return Math.min(activityUnread + urlUnread, 99)
}
