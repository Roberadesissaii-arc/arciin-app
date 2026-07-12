"use client"

import { useEffect, useMemo, useState } from "react"

import { getOllamaModelCapabilities } from "@/lib/api/models"
import type { MobileConnection } from "@/lib/types/api"
import type { OllamaModelCapabilityEntry } from "@/lib/types/models"

export function ollamaCapabilityMap(
  entries: OllamaModelCapabilityEntry[] | undefined,
): Map<string, OllamaModelCapabilityEntry> {
  const map = new Map<string, OllamaModelCapabilityEntry>()
  for (const e of entries ?? []) {
    map.set(e.model, e)
  }
  return map
}

export function useOllamaModelCapabilities(
  connection: MobileConnection,
  profileId: string,
  models: string[],
  enabled = true,
) {
  const modelsKey = useMemo(() => [...models].sort().join("\0"), [models])
  const [entries, setEntries] = useState<OllamaModelCapabilityEntry[] | undefined>(undefined)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || !profileId || models.length === 0) {
      setEntries(undefined)
      setIsFetching(false)
      setError(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    setIsFetching(true)
    setError(null)

    void getOllamaModelCapabilities(connection, profileId, { models }, controller.signal)
      .then((result) => {
        if (!cancelled) {
          setEntries(result.entries)
        }
      })
      .catch((err) => {
        if (!cancelled && err instanceof Error && err.name !== "AbortError") {
          setError(err)
          setEntries([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetching(false)
        }
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [connection, enabled, modelsKey, profileId])

  return { entries, isFetching, error }
}
