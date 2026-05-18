import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"

export type JobSummary = {
  id: string
  type: string
  status: string
  progress: number
  createdAt: string
  updatedAt?: string
}

export async function fetchJobs(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<JobSummary[]>("/jobs", { connection, signal })
}
