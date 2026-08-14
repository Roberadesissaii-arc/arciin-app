"use client"

import { useCallback } from "react"
import Link from "next/link"

import { SectionHeading } from "@/components/ui/section-heading"
import { ServiceCard } from "@/components/ui/service-card"
import {
  Activity,
  HardDrive,
} from "lucide-react"

import { HomePageSkeleton } from "@/components/home/home-page-skeleton"
import { RecentUploadsSection } from "@/components/home/recent-uploads-grid"
import { PlanBadge } from "@/components/shell/plan-badge"
import { getLicenseStatus } from "@/lib/api/license"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import { useCachedHomeOverview } from "@/lib/hooks/use-cached-home-overview"
import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useConnection } from "@/components/providers/connection-provider"
import { homeGreeting, homeSubtitle } from "@/lib/connection/offline-ui"
import {
  activityIconFor,
  activityTypeLabel,
  Clock3,
} from "@/lib/activity/icons"
import type { HomeOverview } from "@/lib/types/models"
import { formatBytes } from "@/lib/utils/format-bytes"
import { formatRelativeDate } from "@/lib/utils/format-date"


function storagePercent(storage: NonNullable<HomeOverview["storage"]>) {
  if (storage.totalBytes && storage.totalBytes > 0) {
    return Math.min(100, Math.round((storage.usageBytes / storage.totalBytes) * 100))
  }
  if (storage.availableBytes != null && storage.availableBytes >= 0) {
    const total = storage.usageBytes + storage.availableBytes
    if (total > 0) return Math.min(100, Math.round((storage.usageBytes / total) * 100))
  }
  return null
}

export function HomePage() {
  const { connection, serverReachable, ready } = useConnection()
  const { data, error, reload } = useCachedHomeOverview()
  const greeting = homeGreeting(connection, serverReachable, ready)

  const licenseLoader = useCallback(
    (conn: Parameters<typeof getLicenseStatus>[0], signal: AbortSignal) =>
      getLicenseStatus(conn, signal),
    [],
  )
  const { data: licenseStatus } = useStablePanelLoad(true, licenseLoader, {
    cacheKey: "license-status",
    staleTimeMs: 60_000,
  })
  const currentPlan = licenseStatus?.plan ?? null

  const storage = data?.storage
  const storagePct = storage ? storagePercent(storage) : null
  const storageLabel =
    storage && storage.totalBytes
      ? `${formatBytes(storage.usageBytes)} of ${formatBytes(storage.totalBytes)}`
      : storage
        ? `${formatBytes(storage.usageBytes)} used`
        : "—"

  // Vault fetch 403s on Free (vault.password is Pro+) — treat "unknown count" as locked.

  // App databases 403 on Free (developer.app_databases is Pro+) — treat "unknown count" as locked.

  if (!data) {
    return (
      <div className="flex flex-col gap-5">
        <HomePageSkeleton greeting={greeting} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        {greeting ? (
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="text-[22px] font-bold tracking-tight text-[#222222]"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
            >
              {greeting}
            </h2>
            {currentPlan ? <PlanBadge plan={currentPlan} /> : null}
          </div>
        ) : (
          <Skeleton
            className="h-7 w-40 max-w-full rounded-lg"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          />
        )}
        <p className="mt-0.5 text-[13px] text-[#717171]">
          {homeSubtitle(connection, serverReachable)}
        </p>
        {/* Closes the introduction, so the tiles below read as a new section
            rather than as more of the greeting. */}
        <div className="mt-4 border-b border-[#e5e5e5]" />
      </div>

      <PageFetchErrorAlert error={error} onRetry={() => void reload()} />

      {/* The supplied card, with its own art. Titles carry the destination; the
          counts stay in the sections below, where a number has room to be read. */}
      <div className="grid grid-cols-2 gap-3">
        <ServiceCard
          title="Jobs"
          href="/jobs"
          imgSrc="/assets/service-cards/gamification.png"
          imgAlt="Bowling pins and ball illustration"
          variant="red"
          className="min-h-[132px]"
        />
        <ServiceCard
          title="Database"
          href="/database"
          imgSrc="/assets/service-cards/design.png"
          imgAlt="Paint bucket illustration"
          variant="default"
          className="min-h-[132px]"
        />
        <ServiceCard
          title="Passwords"
          href="/profile/passwords"
          imgSrc="/assets/service-cards/analytics.png"
          imgAlt="Megaphone illustration"
          variant="gray"
          className="min-h-[132px]"
        />
        <ServiceCard
          title="Events"
          href="/events"
          imgSrc="/assets/service-cards/content.png"
          imgAlt="Notebook and pen illustration"
          variant="blue"
          className="min-h-[132px]"
        />
      </div>

      <SectionHeading>Storage</SectionHeading>

      <div
        className="flex flex-col gap-3 rounded-2xl p-4"
        // The tone from the tile you kept, so Storage sits in the same family.
        style={{ backgroundColor: "#27272a", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex size-7 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <HardDrive className="size-[14px]" style={{ color: "var(--arciin-accent, #ff4f12)" }} />
            </div>
            <span className="text-[13px] font-semibold text-white">Storage</span>
          </div>
          <span className="max-w-[55%] truncate text-right text-[12px] font-semibold text-white/80">
            {storageLabel}
          </span>
        </div>

        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              backgroundColor: "var(--arciin-accent, #ff4f12)",
              width: storagePct != null ? `${Math.max(storagePct, storage?.usageBytes ? 2 : 0)}%` : "0%",
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span>
            {storage ? `${formatBytes(storage.usageBytes)} used` : "Unavailable"}
          </span>
          <span className="font-semibold" style={{ color: "var(--arciin-accent, #ff4f12)" }}>
            {storagePct != null ? `${storagePct}% full` : storage ? "—" : ""}
          </span>
        </div>
      </div>

      <SectionHeading href="/files" action="View all">
        Recent uploads
      </SectionHeading>
      <RecentUploadsSection />

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#a0a0a0]" />
            <span className="text-[13px] font-semibold text-[#222222]">Recent activity</span>
          </div>
          <Link href="/activity" className="text-accent text-[12px] font-semibold active:opacity-70">
            View timeline
          </Link>
        </div>
        <div
          className="overflow-hidden rounded-2xl bg-white"
          style={{ border: "1px solid #e5e5e5" }}
        >
          {data?.recentActivity.length ? (
            <ul className="divide-y divide-[#f0f0f0]">
              {data.recentActivity.map((event) => {
                const Icon = activityIconFor(event)
                return (
                  <li key={event.id} className="flex items-start gap-3 px-4 py-3.5">
                    <div
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
                      style={{ border: "1px solid #e8e8e8" }}
                    >
                      <Icon className="size-3.5 text-[#717171]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[13px] font-semibold text-[#222222]">
                          {event.title}
                        </span>
                        <span className="text-[11px] font-medium text-[#a0a0a0]">
                          {activityTypeLabel(event.type)}
                        </span>
                      </div>
                      {event.message ? (
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[#717171]">
                          {event.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#a0a0a0]">
                      <Clock3 className="size-3 shrink-0" />
                      {formatRelativeDate(event.createdAt)}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-10 text-center text-[13px] text-[#a0a0a0]">No activity yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
