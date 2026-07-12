"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Activity, BriefcaseBusiness, Loader2, RefreshCw, Search, X } from "lucide-react"

import { JobRow } from "@/components/jobs/job-row"
import { MobilePageIntro, MobilePageStickyHeader } from "@/components/shell/mobile-page-intro"
import { MobilePagination } from "@/components/ui/mobile-pagination"
import { formatApiError } from "@/lib/api/errors"
import { fetchJobs, type JobSummary } from "@/lib/api/jobs"
import { getLogsOverview } from "@/lib/api/logs"
import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import { useConnection } from "@/components/providers/connection-provider"
import {
  isServerConnected,
  suppressFetchErrorWhenOffline,
} from "@/lib/connection/offline-ui"

const PAGE_SIZE = 5

export function MobileJobsPage() {
  const { connection, ready, serverReachable } = useConnection()
  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const serverReachableRef = useRef(serverReachable)
  serverReachableRef.current = serverReachable

  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [totalJobs, setTotalJobs] = useState<number | null>(null)
  const [totalRunning, setTotalRunning] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)

  const load = useCallback(async (signal?: AbortSignal) => {
    const conn = connectionRef.current
    const reachable = serverReachableRef.current
    if (!conn) return
    setLoading(true)
    setError(null)
    try {
      const [jobsResult, overviewResult] = await Promise.allSettled([
        fetchJobs(conn, signal),
        getLogsOverview(conn, signal),
      ])
      if (jobsResult.status === "fulfilled") {
        setJobs(jobsResult.value)
      } else {
        throw jobsResult.reason
      }
      // The list endpoint caps at the 50 most recent jobs — use the
      // unbounded /logs/overview counts for the header stats so it never
      // contradicts the true lifetime total once an instance passes 50 jobs.
      if (overviewResult.status === "fulfilled") {
        const j = overviewResult.value.jobs
        setTotalJobs(j.queued + j.active + j.completed + j.failed)
        setTotalRunning(j.queued + j.active)
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(suppressFetchErrorWhenOffline(reachable, formatApiError(err)))
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (serverReachable === false) {
      setError(null)
      setLoading(false)
    }
  }, [serverReachable])

  useEffect(() => {
    if (!ready || !connection || !isServerConnected(serverReachable)) return
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, connection?.sessionToken, serverReachable])

  const active = totalRunning ?? jobs.filter((j) => j.status === "QUEUED" || j.status === "ACTIVE").length
  const total = totalJobs ?? jobs.length
  const filtered = query.trim()
    ? jobs.filter(
        (j) =>
          j.type.toLowerCase().includes(query.toLowerCase()) ||
          j.status.toLowerCase().includes(query.toLowerCase()),
      )
    : jobs
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">

      <MobilePageStickyHeader>
        <MobilePageIntro
          title="Jobs"
          subtitle="Background work on your instance — media processing, storage scans, and maintenance tasks."
          status={
            loading
              ? "Loading…"
              : active > 0
                ? `${active} running · ${total} total`
                : total > 0
                  ? `${total} job${total === 1 ? "" : "s"} · queue clear`
                  : "No background jobs yet"
          }
          cornerIcon={BriefcaseBusiness}
          statusIcon={BriefcaseBusiness}
        />

        <div className="mt-1.5 flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <Search className="size-4 shrink-0 text-[#c0c0c0]" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Search jobs…"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#222222] outline-none placeholder:text-[#c0c0c0]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  setPage(0)
                }}
                className="shrink-0 text-[#c0c0c0] active:text-[#717171]"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#717171] disabled:opacity-50 active:bg-[#f7f7f7]"
            style={{ border: "1px solid #e5e5e5" }}
            aria-label="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </MobilePageStickyHeader>

      <PageFetchErrorAlert error={error} onRetry={() => void load()} />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-7 animate-spin text-[#c0c0c0]" />
        </div>
      ) : jobs.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl bg-white py-14"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <div className="empty-state-icon flex size-14 items-center justify-center rounded-2xl">
            <BriefcaseBusiness className="text-accent size-6" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#222222]">No jobs yet</p>
            <p className="mt-0.5 text-[12px] text-[#a0a0a0]">
              Uploads and settings changes will queue work here automatically.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className="overflow-hidden rounded-2xl bg-white"
            style={{ border: "1px solid #e5e5e5" }}
          >
            {pageItems.map((job, i) => (
              <div key={job.id}>
                {i > 0 ? <div className="mx-4 h-px bg-[#f5f5f5]" /> : null}
                <JobRow job={job} />
              </div>
            ))}
          </div>

          <MobilePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Link
        href="/activity"
        className="flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-semibold text-[#717171] active:bg-[#f7f7f7]"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <Activity className="size-4" />
        View activity timeline instead
      </Link>
    </div>
  )
}
