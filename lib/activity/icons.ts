import {
  Clock3,
  FileText,
  Folder,
  Key,
  Library,
  Upload,
  Zap,
  type LucideIcon,
} from "lucide-react"

import type { ActivitySummary } from "@/lib/types/models"

const ENTITY_ICONS: Record<string, LucideIcon> = {
  asset: FileText,
  upload: Upload,
  folder: Folder,
  library: Library,
  "api-key": Key,
}

export function activityIconFor(event: ActivitySummary): LucideIcon {
  const key = event.entityType ?? event.type.split(".")[0] ?? ""
  return ENTITY_ICONS[key] ?? Zap
}

export function activityTypeLabel(type: string) {
  return type
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" · ")
}

export { Clock3 }
