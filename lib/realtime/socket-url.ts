import type { MobileConnection } from "@/lib/types/api"

/** Socket.IO server URL for the connected Arciin instance (API host). */
export function getMobileSocketUrl(connection: MobileConnection): string {
  return connection.socketUrl.replace(/\/+$/, "")
}
