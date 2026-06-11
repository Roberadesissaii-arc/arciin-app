"use client"

import { useCallback, useEffect, useState } from "react"

import {
  panelStatusFromText,
  type PanelStatusMessage,
} from "@/lib/settings/panel-status-message"

/** Status toast that clears when the settings section is closed (`enabled` false). */
export function usePanelStatusMessage(enabled = true) {
  const [message, setMessage] = useState<PanelStatusMessage | null>(null)

  useEffect(() => {
    if (!enabled) setMessage(null)
  }, [enabled])

  const showStatus = useCallback((textOrMessage: string | PanelStatusMessage) => {
    setMessage(
      typeof textOrMessage === "string" ? panelStatusFromText(textOrMessage) : textOrMessage,
    )
  }, [])

  const clearStatus = useCallback(() => setMessage(null), [])

  return { message, showStatus, clearStatus, setMessage }
}
