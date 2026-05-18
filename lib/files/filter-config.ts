import {
  Clapperboard,
  FileText,
  Files,
  Image as ImageIcon,
  Inbox,
  Music4,
} from "lucide-react"

import type { FilesFilterId } from "@/lib/files/library-helpers"

export const FILES_FILTERS: {
  id: FilesFilterId
  label: string
  icon: React.ElementType
}[] = [
  { id: "all", label: "All", icon: Files },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "videos", label: "Videos", icon: Clapperboard },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "music", label: "Music", icon: Music4 },
  { id: "documents", label: "Documents", icon: FileText },
]
