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
      className={className ?? "rounded-xl px-3.5 py-3 text-[12px] leading-relaxed text-[#717171]"}
      style={{ backgroundColor: "#f7f7f7", border: "1px solid #e5e5e5" }}
      role="status"
    >
      <p>{visible}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={() => void onRetry()}
          className="text-accent mt-2 font-semibold"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
