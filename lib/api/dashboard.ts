import { fetchApi } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import type { MobileConnection } from "@/lib/types/api"
import type { PasswordVaultList } from "@/lib/api/password-vault"
import type {
  ActivitySummary,
  HomeOverview,
  LogsOverview,
  StorageSettings,
  UploadSessionSummary,
} from "@/lib/types/models"

const IN_PROGRESS_UPLOAD = new Set([
  "QUEUED",
  "UPLOADING",
  "UPLOADED",
  "ANALYZING",
  "CLASSIFIED",
  "PROCESSING",
])

async function fetchOptional<T>(
  path: string,
  connection: MobileConnection,
  signal?: AbortSignal,
): Promise<T | null> {
  try {
    return await fetchApi<T>(path, { connection, signal })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
      return null
    }
    throw err
  }
}

export async function fetchHomeOverview(
  connection: MobileConnection,
  signal?: AbortSignal,
): Promise<HomeOverview> {
  const opts = { connection, signal }

  const [logsResult, activityResult, uploadsResult, storageResult, vaultResult] =
    await Promise.allSettled([
      fetchApi<LogsOverview>("/logs/overview", opts),
      fetchApi<ActivitySummary[]>("/activity", opts),
      fetchApi<UploadSessionSummary[]>("/uploads", opts),
      fetchOptional<StorageSettings>("/settings/storage", connection, signal).then(
        (admin) => admin ?? fetchOptional<StorageSettings>("/instance/storage-summary", connection, signal),
      ),
      fetchOptional<PasswordVaultList>("/settings/password-vault", connection, signal),
    ])

  const firstError = [logsResult, activityResult, uploadsResult].find(
    (r) => r.status === "rejected",
  )
  if (firstError?.status === "rejected") {
    throw firstError.reason
  }

  const logs =
    logsResult.status === "fulfilled"
      ? logsResult.value
      : { jobs: { queued: 0, active: 0, completed: 0, failed: 0 } }
  const activity = activityResult.status === "fulfilled" ? activityResult.value : []
  const uploads = uploadsResult.status === "fulfilled" ? uploadsResult.value : []
  const storage =
    storageResult.status === "fulfilled" ? storageResult.value : null
  const vault = vaultResult.status === "fulfilled" ? vaultResult.value : null

  const uploadInProgress = uploads.filter((u) => IN_PROGRESS_UPLOAD.has(u.status)).length

  const jobStats = logs.jobs ?? { queued: 0, active: 0, completed: 0, failed: 0 }
  const runningJobs = jobStats.queued + jobStats.active
  const jobCount = runningJobs + jobStats.completed + jobStats.failed

  return {
    jobCount,
    runningJobs,
    uploadCount: uploads.length,
    uploadInProgress,
    passwordVaultCount: vault?.total ?? null,
    passwordVaultLocked: vault ? vault.lockRequired && !vault.secretsVisible : null,
    recentEventsCount: activity.length,
    storage,
    recentActivity: activity.slice(0, 6),
  }
}
