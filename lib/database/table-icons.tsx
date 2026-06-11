import type { LucideIcon } from "lucide-react"
import {
  Activity,
  Boxes,
  Database,
  Files,
  Folder,
  FolderTree,
  HardDrive,
  Home,
  Key,
  KeyRound,
  Layers2,
  Library,
  Puzzle,
  User,
} from "lucide-react"

const TABLE_ICONS: Record<string, LucideIcon> = {
  users: User,
  sessions: KeyRound,
  "api-keys": Key,
  libraries: Library,
  folders: Folder,
  assets: Files,
  "storage-objects": HardDrive,
  "activity-events": Activity,
  jobs: Boxes,
  integrations: Puzzle,
  "app-databases": Layers2,
  "app-database-folders": FolderTree,
  "app-database-records": Database,
  "instance-config": Home,
}

export function tableIconFor(name: string): LucideIcon {
  return TABLE_ICONS[name] ?? Database
}
