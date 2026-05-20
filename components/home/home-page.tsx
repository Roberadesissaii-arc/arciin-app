"use client"

import Link from "next/link"
import {
  Activity,
  BriefcaseBusiness,
  CloudUpload,
  FingerprintPattern,
  GalleryVerticalEnd,
  HardDrive,
} from "lucide-react"

import { HomePageSkeleton } from "@/components/home/home-page-skeleton"
import { useCachedHomeOverview } from "@/lib/hooks/use-cached-home-overview"
import { useConnection } from "@/components/providers/connection-provider"
import {
  activityIconFor,
  activityTypeLabel,
  Clock3,
} from "@/lib/activity/icons"
import type { HomeOverview } from "@/lib/types/models"
import { formatBytes } from "@/lib/utils/format-bytes"
import { formatRelativeDate } from "@/lib/utils/format-date"

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  href?: string
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#717171]">{label}</span>
        <div
          className="flex size-7 items-center justify-center rounded-xl bg-[#f7f7f7]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <Icon className="size-[14px] text-[#717171]" />
        </div>
      </div>
      <div>
        <p className="text-[22px] font-bold leading-none tracking-tight text-[#222222]">
          {value}
        </p>
        {sub ? <p className="mt-1 text-[11px] text-[#a0a0a0]">{sub}</p> : null}
      </div>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="flex flex-col gap-3 rounded-2xl bg-white p-4 transition-opacity active:opacity-80"
        style={{ border: "1px solid #e5e5e5" }}
      >
        {body}
      </Link>
    )
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl bg-white p-4"
      style={{ border: "1px solid #e5e5e5" }}
    >
      {body}
    </div>
  )
}

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
  const { connection } = useConnection()
  const { data, error, reload } = useCachedHomeOverview()

  const storage = data?.storage
  const storagePct = storage ? storagePercent(storage) : null
  const storageLabel =
    storage && storage.totalBytes
      ? `${formatBytes(storage.usageBytes)} of ${formatBytes(storage.totalBytes)}`
      : storage
        ? `${formatBytes(storage.usageBytes)} used`
        : "—"

  const passwordsValue =
    data?.passwordVaultCount != null ? String(data.passwordVaultCount) : "—"

  const passwordsSub =
    data?.passwordVaultCount == null
      ? "unavailable"
      : data.passwordVaultLocked
        ? "vault locked"
        : data.passwordVaultCount === 1
          ? "saved entry"
          : "saved entries"

  if (!data) {
    return (
      <div className="flex flex-col gap-5">
        {error ? (
          <div
            className="rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
            role="alert"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void reload()}
              className="mt-2 font-semibold text-[#ff4f12]"
            >
              Try again
            </button>
          </div>
        ) : null}
        <HomePageSkeleton userName={connection?.user.name} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2
          className="text-[22px] font-bold tracking-tight text-[#222222]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          {connection?.user.name
            ? `Hi, ${connection.user.name.split(" ")[0]}`
            : "Overview"}
        </h2>
        <p className="mt-0.5 text-[13px] text-[#717171]">
          {connection?.instanceName
            ? `${connection.instanceName} at a glance`
            : "Your Arciin instance at a glance."}
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
          role="alert"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-2 font-semibold text-[#ff4f12]"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Jobs"
          value={String(data.jobCount)}
          sub={
            data.runningJobs > 0
              ? `${data.runningJobs} running`
              : data.jobCount > 0
                ? "all done"
                : "none yet"
          }
          icon={BriefcaseBusiness}
          href="/jobs"
        />
        <StatCard
          label="Uploads"
          value={String(data.uploadInProgress)}
          sub={
            data.uploadInProgress > 0
              ? "in progress"
              : `${data.uploadCount} recent`
          }
          icon={CloudUpload}
          href="/files"
        />
        <StatCard
          label="Passwords"
          value={passwordsValue}
          sub={passwordsSub}
          icon={FingerprintPattern}
          href="/profile/passwords"
        />
        <StatCard
          label="Events"
          value="Live"
          sub="Socket.IO monitor"
          icon={GalleryVerticalEnd}
          href="/events"
        />
      </div>

      <div
        className="flex flex-col gap-3 rounded-2xl bg-white p-4"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex size-7 items-center justify-center rounded-xl bg-[#f7f7f7]"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <HardDrive className="size-[14px] text-[#717171]" />
            </div>
            <span className="text-[13px] font-semibold text-[#222222]">Storage</span>
          </div>
          <span className="max-w-[55%] truncate text-right text-[12px] font-medium text-[#a0a0a0]">
            {storageLabel}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-[#f0f0f0]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: storagePct != null ? `${Math.max(storagePct, storage?.usageBytes ? 2 : 0)}%` : "0%",
              backgroundColor: "#ff4f12",
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#a0a0a0]">
            {storage ? `${formatBytes(storage.usageBytes)} used` : "Unavailable"}
          </span>
          <span className="font-medium text-[#717171]">
            {storagePct != null ? `${storagePct}% full` : storage ? "—" : ""}
          </span>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="size-4 text-[#a0a0a0]" />
          <span className="text-[13px] font-semibold text-[#222222]">Recent activity</span>
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
