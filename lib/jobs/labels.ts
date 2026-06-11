import {
  BriefcaseBusiness,
  Database,
  FileImage,
  FileSearch,
  HardDrive,
  RefreshCw,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import type { JobSummary } from "@/lib/api/jobs"

type JobMeta = {
  title: string
  category: string
  icon: LucideIcon
  description: string
}

const JOB_META: Record<string, JobMeta> = {
  analyze_file: {
    title: "Analyze file",
    category: "Media",
    icon: FileSearch,
    description: "Inspecting file type and routing it to the right library.",
  },
  extract_metadata: {
    title: "Extract metadata",
    category: "Media",
    icon: FileSearch,
    description: "Reading duration, dimensions, and codec details from the asset.",
  },
  generate_thumbnail: {
    title: "Generate thumbnail",
    category: "Media",
    icon: FileImage,
    description: "Creating a preview image for browsing and grids.",
  },
  sync_connector_mirror: {
    title: "Sync connector",
    category: "Storage",
    icon: RefreshCw,
    description: "Mirroring files from a connected storage location.",
  },
  cleanup_temp_files: {
    title: "Clean up temp files",
    category: "Maintenance",
    icon: Trash2,
    description: "Removing leftover temporary upload files from disk.",
  },
  calculate_storage_usage: {
    title: "Calculate storage usage",
    category: "Storage",
    icon: HardDrive,
    description: "Scanning volumes to refresh usage and free-space stats.",
  },
  migrate_storage: {
    title: "Migrate storage",
    category: "Storage",
    icon: Database,
    description: "Moving library data to a new storage root path.",
  },
  plex_sync_placeholder: {
    title: "Plex sync",
    category: "Integration",
    icon: RefreshCw,
    description: "Placeholder job for future Plex library synchronization.",
  },
}

function formatJobTypeFallback(type: string) {
  return type
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function jobMetaFor(type: string): JobMeta {
  return (
    JOB_META[type] ?? {
      title: formatJobTypeFallback(type),
      category: "Background",
      icon: BriefcaseBusiness,
      description: "Background task on your Arciin instance.",
    }
  )
}

export function jobTitle(type: string) {
  return jobMetaFor(type).title
}

export function jobCategoryLabel(type: string) {
  return jobMetaFor(type).category
}

export function jobIconFor(type: string): LucideIcon {
  return jobMetaFor(type).icon
}

const CATEGORY_BADGE: Record<string, { bg: string; color: string }> = {
  Media: { bg: "var(--arciin-accent-soft, #fff4f0)", color: "var(--arciin-accent, #ff4f12)" },
  Storage: { bg: "#eff6ff", color: "#2563eb" },
  Maintenance: { bg: "#f7f7f7", color: "#717171" },
  Integration: { bg: "#f5f3ff", color: "#7c3aed" },
  Background: { bg: "#f7f7f7", color: "#717171" },
}

export function jobCategoryBadgeStyle(type: string) {
  const category = jobCategoryLabel(type)
  return CATEGORY_BADGE[category] ?? CATEGORY_BADGE.Background
}

export function jobStatusMeta(status: string) {
  switch (status) {
    case "ACTIVE":
      return { label: "Running", bg: "#dcfce7", color: "#16a34a" }
    case "QUEUED":
      return { label: "Queued", bg: "#fffbeb", color: "#d97706" }
    case "COMPLETED":
      return { label: "Completed", bg: "#f0fdf4", color: "#15803d" }
    case "FAILED":
      return { label: "Failed", bg: "#fef2f2", color: "#b91c1c" }
    default:
      return { label: status, bg: "#f7f7f7", color: "#717171" }
  }
}

function payloadHint(payload: JobSummary["payload"]): string | null {
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, unknown>
  if (typeof p.bytesToCopy === "number" && p.bytesToCopy > 0) {
    const gb = p.bytesToCopy / 1024 ** 3
    return gb >= 1
      ? `About ${gb.toFixed(1)} GB to move.`
      : `About ${Math.round(p.bytesToCopy / 1024 ** 2)} MB to move.`
  }
  if (typeof p.assetId === "string") return "Linked to a library asset."
  return null
}

export function jobDescription(job: JobSummary): string {
  const base = jobMetaFor(job.type).description
  const hint = payloadHint(job.payload)

  if (job.status === "FAILED" && job.error?.trim()) {
    return job.error.trim()
  }

  if (job.status === "ACTIVE" && job.progress > 0) {
    const progress = `${job.progress}% complete`
    return hint ? `${hint} · ${progress}` : `${base} · ${progress}`
  }

  if (job.status === "QUEUED") {
    return hint ? `${hint} Waiting in the queue.` : `${base} Waiting in the queue.`
  }

  if (job.status === "COMPLETED") {
    return hint ? `${hint} Finished successfully.` : `${base} Finished successfully.`
  }

  return hint ? `${hint} ${base}` : base
}
