"use client"

import { useConnection } from "@/components/providers/connection-provider"
import { suppressFetchErrorWhenOffline } from "@/lib/connection/offline-ui"

type MutedPanelErrorProps = {
  error: string | null | undefined
  onRetry?: () => void
  className?: string
}

/** Inline panel error — hidden when the shell offline banner already explains unreachable server. */
export function MutedPanelError({ error, onRetry, className }: MutedPanelErrorProps) {
  const { serverReachable } = useConnection()
  const visible = suppressFetchErrorWhenOffline(serverReachable, error ?? null)
  if (!visible) return null

  return (
    <div
      className={className ?? "rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"}
      style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
      role="alert"
    >
      <p>{visible}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-2 font-semibold text-[#ff4f12]"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
