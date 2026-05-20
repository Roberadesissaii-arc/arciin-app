"use client"

import { createContext, useContext, useMemo, useState } from "react"

import type { FilesFilterId } from "@/lib/files/library-helpers"
import type { LibrarySummary } from "@/lib/types/assets"

export type FilesChromeModel = {
  subtitle: string
  filter: FilesFilterId
  libraries: LibrarySummary[]
  libraryScoped: boolean
  breadcrumbLibrary: string | null
  currentFolderName: string | null
  loading: boolean
  hasCache: boolean
  refreshing: boolean
  uploading: boolean
  canUpload: boolean
  canCreateFolder: boolean
  onRefresh: () => void
  onUpload: () => void
  onCreateFolder: () => void
  onChangeFilter: (id: FilesFilterId) => void
  onGoToLibraryRoot: () => void
}

type FilesChromeContextValue = {
  chrome: FilesChromeModel | null
  setChrome: (chrome: FilesChromeModel | null) => void
}

const FilesChromeContext = createContext<FilesChromeContextValue | null>(null)

export function FilesChromeProvider({ children }: { children: React.ReactNode }) {
  const [chrome, setChrome] = useState<FilesChromeModel | null>(null)
  const value = useMemo(() => ({ chrome, setChrome }), [chrome])
  return <FilesChromeContext.Provider value={value}>{children}</FilesChromeContext.Provider>
}

export function useFilesChrome() {
  const ctx = useContext(FilesChromeContext)
  if (!ctx) {
    throw new Error("useFilesChrome must be used within FilesChromeProvider")
  }
  return ctx
}

export function useFilesChromeOptional() {
  return useContext(FilesChromeContext)
}
