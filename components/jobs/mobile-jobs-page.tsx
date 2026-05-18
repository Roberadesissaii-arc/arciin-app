"use client"

import { useCallback, useEffect, useState } from "react"
import { BriefcaseBusiness, Loader2 } from "lucide-react"

import { formatApiError } from "@/lib/api/errors"
import { fetchJobs, type JobSummary } from "@/lib/api/jobs"
import { useConnection } from "@/components/providers/connection-provider"
import { formatRelativeDate } from "@/lib/utils/format-date"

function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Running"
    case "QUEUED":
      return "Queued"
    case "COMPLETED":
      return "Completed"
    case "FAILED":
      return "Failed"
    default:
      return status
  }
}

export function MobileJobsPage() {
  const { connection, ready } = useConnection()
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!connection) return
    setLoading(true)
    setError(null)
    try {
      setJobs(await fetchJobs(connection, signal))
    } catch (err) {
      if (!signal?.aborted) setError(formatApiError(err))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [connection])

  useEffect(() => {
    if (!ready || !connection) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [ready, connection, load])

  const active = jobs.filter((j) => j.status === "QUEUED" || j.status === "ACTIVE").length

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2
          className="text-[22px] font-bold tracking-tight text-[#222222]"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          Jobs
        </h2>
        <p className="mt-0.5 text-[13px] text-[#717171]">
          {loading ? "Loading…" : `${active} running · ${jobs.length} total`}
        </p>
      </div>

      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </div>
      ) : null}

      <div
        className="overflow-hidden rounded-2xl bg-white"
        style={{ border: "1px solid #e5e5e5" }}
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-7 animate-spin text-[#c0c0c0]" />
          </div>
        ) : jobs.length ? (
          <ul className="divide-y divide-[#f0f0f0]">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-start gap-3 px-4 py-3.5">
                <div
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
                  style={{ border: "1px solid #e8e8e8" }}
                >
                  <BriefcaseBusiness className="size-3.5 text-[#717171]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#222222]">{job.type}</p>
                  <p className="text-[11px] font-medium text-[#a0a0a0]">{statusLabel(job.status)}</p>
                  {job.progress > 0 && job.status === "ACTIVE" ? (
                    <p className="mt-0.5 text-[12px] text-[#717171]">{job.progress}%</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11px] text-[#a0a0a0]">
                  {formatRelativeDate(job.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-12 text-center text-[13px] text-[#a0a0a0]">No jobs yet</p>
        )}
      </div>
    </div>
  )
}
