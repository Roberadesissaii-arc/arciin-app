"use client"

import { useConnection } from "@/components/providers/connection-provider"
import { shouldShowPageFetchError } from "@/lib/connection/offline-ui"

type PageFetchErrorAlertProps = {
  error: string | null
  onRetry?: () => void
  className?: string
}

/** Inline page error — hidden when the shell offline banner already explains the failure. */
export function PageFetchErrorAlert({ error, onRetry, className }: PageFetchErrorAlertProps) {
  const { serverReachable, tryAutoReconnect } = useConnection()

  if (!shouldShowPageFetchError(serverReachable, error) || !error) {
    return null
  }

  return (
    <div
      className={className ?? "rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"}
      style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
      role="alert"
    >
      <p>{error}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={() => {
            void tryAutoReconnect().then((ok) => {
              if (ok) onRetry()
            })
          }}
          className="mt-2 font-semibold text-[#ff4f12]"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
