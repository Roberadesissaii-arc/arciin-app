import { fetchApi } from "@/lib/api/client"
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
}

export async function fetchRecentActivity(
  connection: MobileConnection,
  signal?: AbortSignal,
) {
  return fetchApi<ActivitySummary[]>("/activity", { connection, signal })
}

export function countUnreadActivity(
  items: ActivitySummary[],
  lastSeenIso: string | null,
): number {
  if (!lastSeenIso) {
    return items.length > 0 ? Math.min(items.length, 99) : 0
  }
  const lastSeen = Date.parse(lastSeenIso)
  if (Number.isNaN(lastSeen)) return items.length > 0 ? 1 : 0
  return items.filter((item) => Date.parse(item.createdAt) > lastSeen).length
}
