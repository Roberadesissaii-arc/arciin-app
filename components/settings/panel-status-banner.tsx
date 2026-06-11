"use client"

import { CompactStatusBanner } from "@/components/shell/compact-status-banner"
import type { PanelStatusMessage } from "@/lib/settings/panel-status-message"

export function PanelStatusBanner({ message }: { message: PanelStatusMessage | null }) {
  if (!message) return null
  return <CompactStatusBanner title={message.title} detail={message.detail} />
}
