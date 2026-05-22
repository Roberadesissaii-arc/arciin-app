import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"

export type JobSummary = {
  id: string
  type: string
  status: string
  progress: number
  createdAt: string
  updatedAt?: string
  completedAt?: string | null
  error?: string | null
  payload?: Record<string, unknown> | null
}

export async function fetchJobs(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<JobSummary[]>("/jobs", { connection, signal })
}
