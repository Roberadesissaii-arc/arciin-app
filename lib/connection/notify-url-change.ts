import { notifyMobilePublicUrlChanged } from "@/lib/notifications/public-url-changed"

/** Notify when auto-reconnect or socket updates changed the public web URL. */
export function notifyIfPublicWebUrlChanged(
  previousWebUrl: string | undefined,
  newWebUrl: string | undefined,
) {
  const prev = previousWebUrl?.trim().replace(/\/+$/, "") ?? ""
  const next = newWebUrl?.trim().replace(/\/+$/, "") ?? ""
  if (!prev || !next || prev === next) return
  notifyMobilePublicUrlChanged({ previousUrl: prev, newUrl: next })
}
