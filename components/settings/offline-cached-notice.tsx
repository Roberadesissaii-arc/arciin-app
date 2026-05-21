"use client"

import { CloudOff, Loader2 } from "lucide-react"

/** Shown inside settings panels when cached data is visible but the server is unreachable. */
export function OfflineCachedNotice({
  revalidating,
}: {
  revalidating?: boolean
}) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5"
      style={{ backgroundColor: "#f7f7f7", border: "1px solid #e5e5e5" }}
      role="status"
    >
      {revalidating ? (
        <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-[#a0a0a0]" />
      ) : (
        <CloudOff className="mt-0.5 size-3.5 shrink-0 text-[#a0a0a0]" />
      )}
      <p className="text-[11px] leading-relaxed text-[#717171]">
        {revalidating
          ? "Checking your server… Showing last saved data until it responds."
          : "Showing last saved data. Your server is offline — reconnect under Remote access when you are back online."}
      </p>
    </div>
  )
}
