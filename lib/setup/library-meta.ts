import {
  Clapperboard,
  FileText,
  ImageIcon,
  Inbox,
  Music4,
  type LucideIcon,
} from "lucide-react"

export const SETUP_LIBRARY_OPTIONS = [
  "Videos",
  "Images",
  "Music",
  "Documents",
  "Inbox",
] as const

export type SetupLibraryOption = (typeof SETUP_LIBRARY_OPTIONS)[number]

export const setupLibraryMeta: Record<
  SetupLibraryOption,
  { description: string; icon: LucideIcon }
> = {
  Videos: {
    description: "Movies, screen recordings, and clips routed to the video library.",
    icon: Clapperboard,
  },
  Images: {
    description: "Photos, renders, screenshots, and artwork kept in one place.",
    icon: ImageIcon,
  },
  Music: {
    description: "Audio uploads, albums, and sound assets ready for playback later.",
    icon: Music4,
  },
  Documents: {
    description: "PDFs, notes, archives, and structured docs for the instance.",
    icon: FileText,
  },
  Inbox: {
    description: "Fallback destination for anything Arciin cannot classify yet.",
    icon: Inbox,
  },
}
