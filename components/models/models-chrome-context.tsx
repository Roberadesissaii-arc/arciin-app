"use client"

import { createContext, useContext, useMemo, useState } from "react"

import type { ModelsFilterId } from "@/lib/models/filter-config"

export type ModelsChromeModel = {
  subtitle: string
  filter: ModelsFilterId
  connectedCount: number
  totalCount: number
  loading: boolean
  refreshing: boolean
  /** False when Arciin API is unreachable — disable connect / add actions */
  serverOnline: boolean
  onRefresh: () => void
  onChangeFilter: (id: ModelsFilterId) => void
  /** Open add-provider bottom sheet */
  onAddProvider: () => void
}

type ModelsChromeContextValue = {
  chrome: ModelsChromeModel | null
  setChrome: (chrome: ModelsChromeModel | null) => void
}

const ModelsChromeContext = createContext<ModelsChromeContextValue | null>(null)

export function ModelsChromeProvider({ children }: { children: React.ReactNode }) {
  const [chrome, setChrome] = useState<ModelsChromeModel | null>(null)
  const value = useMemo(
    () => ({ chrome, setChrome }),
    // setChrome is stable; only chrome payload changes
    [chrome],
  )
  return <ModelsChromeContext.Provider value={value}>{children}</ModelsChromeContext.Provider>
}

export function useModelsChromeOptional() {
  return useContext(ModelsChromeContext)
}
