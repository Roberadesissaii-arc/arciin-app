"use client"

import { useCallback } from "react"
import { Database, Loader2 } from "lucide-react"

import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { SettingsPanelLink } from "@/components/settings/mobile-toggle-row"
import { fetchAdminTables } from "@/lib/api/admin"
import { fetchHealth } from "@/lib/api/health"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"

type DatabaseSummary = { dbStatus: string; tableCount: number }

export function DatabaseInlinePanel({ enabled }: { enabled: boolean }) {
  const load = useCallback(
    async (connection: Parameters<typeof fetchHealth>[0], signal: AbortSignal) => {
      const [health, tables] = await Promise.all([
        fetchHealth(connection, signal).catch(() => null),
        fetchAdminTables(connection, signal).catch(() => []),
      ])
      return {
        dbStatus: health?.database ?? "unknown",
        tableCount: tables.length,
      }
    },
    [],
  )

  const { data, loading, error, showingCachedOffline, isRevalidating, reload } =
    useStablePanelLoad<DatabaseSummary>(enabled, load, {
      cacheKey: "database",
    })

  if (!enabled) return null

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  if (!data) {
    return <MutedPanelError error={error} onRetry={() => void reload()} />
  }

  return (
    <div className="flex flex-col gap-4">
      {showingCachedOffline ? (
        <OfflineCachedNotice revalidating={isRevalidating} />
      ) : null}
      <SettingsIntroCard
        icon={Database}
        title="Database"
        description="Inspect PostgreSQL tables and row counts for this instance. Open the database app for full browsing."
      />

      <div className="flex gap-2">
        <div
          className="flex flex-1 flex-col rounded-xl px-3 py-2.5"
          style={{ border: "1px solid #e5e5e5", backgroundColor: "#f7f7f7" }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">Status</span>
          <span className="mt-0.5 text-[14px] font-bold capitalize text-[#222222]">
            {data?.dbStatus ?? "—"}
          </span>
        </div>
        <div
          className="flex flex-1 flex-col rounded-xl px-3 py-2.5"
          style={{ border: "1px solid #e5e5e5", backgroundColor: "#f7f7f7" }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">Tables</span>
          <span className="mt-0.5 text-[14px] font-bold tabular-nums text-[#222222]">
            {data?.tableCount ?? "—"}
          </span>
        </div>
      </div>

      <SettingsPanelLink href="/database" label="Open database" />
    </div>
  )
}
