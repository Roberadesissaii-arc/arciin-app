"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  Activity,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

import { JobRow } from "@/components/jobs/job-row"
import { formatApiError } from "@/lib/api/errors"
import { fetchJobs, type JobSummary } from "@/lib/api/jobs"
import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import { useConnection } from "@/components/providers/connection-provider"

const PAGE_SIZE = 5

export function MobileJobsPage() {
  const { connection, ready } = useConnection()
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(0)

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

      {/* ── sticky intro card + search row ──────────────────────── */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-2" style={{ backgroundColor: "#f7f7f7" }}>
        <div
          className="overflow-hidden rounded-3xl"
          style={{ background: "linear-gradient(155deg, #ff6a30 0%, #c82d00 100%)" }}
        >
          <div className="px-5 pt-5 pb-5">
            <p
              className="text-[22px] font-black leading-none tracking-tight text-white"
              style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
            >
              Jobs
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Background work on your instance — media processing, storage scans, and maintenance tasks.
            </p>
            <p className="mt-2 text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
              {loading
                ? "Loading…"
                : active > 0
                  ? `${active} running · ${jobs.length} total`
                  : jobs.length > 0
                    ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} · queue clear`
                    : "No background jobs yet"}
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
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
      </div>

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
          <div
            className="flex size-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "#fff4f0", border: "1px solid rgba(255,79,18,0.15)" }}
          >
            <BriefcaseBusiness className="size-6 text-[#ff4f12]" />
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

          {totalPages > 1 ? (
            <div
              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3"
              style={{ border: "1px solid #e5e5e5" }}
            >
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="flex size-9 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#717171] transition-opacity disabled:opacity-30 active:bg-[#efefef]"
                style={{ border: "1px solid #e5e5e5" }}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    style={{
                      width: page === i ? 20 : 8,
                      height: 8,
                      borderRadius: 99,
                      transition: "width 0.2s, background-color 0.2s",
                      backgroundColor: page === i ? "#ff4f12" : "#e0e0e0",
                    }}
                    aria-label={`Page ${i + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={page === totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="flex size-9 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#717171] transition-opacity disabled:opacity-30 active:bg-[#efefef]"
                style={{ border: "1px solid #e5e5e5" }}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          ) : null}
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
