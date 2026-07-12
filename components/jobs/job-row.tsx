"use client"

import {
  jobCategoryBadgeStyle,
  jobCategoryLabel,
  jobDescription,
  jobIconFor,
  jobStatusMeta,
  jobTitle,
} from "@/lib/jobs/labels"
import type { JobSummary } from "@/lib/api/jobs"
import { Clock3 } from "@/lib/activity/icons"
import { formatRelativeDate } from "@/lib/utils/format-date"

export function JobRow({ job }: { job: JobSummary }) {
  const Icon = jobIconFor(job.type)
  const status = jobStatusMeta(job.status)
  const category = jobCategoryBadgeStyle(job.type)
  const isActive = job.status === "ACTIVE"

  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
        style={{ border: "1px solid #e8e8e8" }}
      >
        <Icon className="size-[15px] text-[#717171]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-[#222222]">{jobTitle(job.type)}</p>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#a0a0a0]">
            <Clock3 className="size-3 shrink-0" />
            {formatRelativeDate(job.updatedAt ?? job.createdAt)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {status.label}
          </span>
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: category.bg, color: category.color }}
          >
            {jobCategoryLabel(job.type)}
          </span>
        </div>

        <p className="mt-1 truncate text-[12px] leading-relaxed text-[#717171]">
          {jobDescription(job)}
        </p>

        {isActive && job.progress > 0 ? (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-[#f0f0f0]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${job.progress}%`, backgroundColor: status.color }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
