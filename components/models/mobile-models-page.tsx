"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MobileModelsListSkeleton } from "@/components/models/mobile-provider-card-skeleton"

import { MobileAddProviderSheet } from "@/components/models/mobile-add-provider-sheet"
import { MobileConnectSheet } from "@/components/models/mobile-connect-sheet"
import { MobileProviderCard } from "@/components/models/mobile-provider-card"
import { useModelsChromeOptional } from "@/components/models/models-chrome-context"
import { useConnection } from "@/components/providers/connection-provider"
import { getChatSelection, setChatSelection } from "@/lib/api/chat"
import { formatApiError } from "@/lib/api/errors"
import { getModelProfiles, setDefaultModelProfile } from "@/lib/api/models"
import type { ModelsFilterId } from "@/lib/models/filter-config"
import {
  chatModelForProfile,
  isProviderConnected,
  profileForProvider,
} from "@/lib/models/model-helpers"
import { providerMetaFor } from "@/lib/models/provider-catalog"
import { MODEL_PROVIDERS, type ProviderMeta } from "@/lib/models/provider-catalog"
import type { ModelProfile } from "@/lib/types/models"

export function MobileModelsPage() {
  const { connection, ready } = useConnection()
  const setChrome = useModelsChromeOptional()?.setChrome
  const connectionRef = useRef(connection)
  connectionRef.current = connection

  const [models, setModels] = useState<ModelProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [filter, setFilter] = useState<ModelsFilterId>("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [sheetMeta, setSheetMeta] = useState<ProviderMeta | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)

  const sessionKey = connection?.sessionToken ?? null

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    const conn = connectionRef.current
    if (!conn) return
    if (opts?.refresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const [list, selection] = await Promise.all([
        getModelProfiles(conn),
        getChatSelection(conn).catch(() => null),
      ])
      setModels(list)
      if (selection) {
        setActiveProfileId(selection.profileId)
      } else {
        const def = list.find((m) => m.isDefault) ?? list[0]
        if (def) setActiveProfileId(def.id)
      }
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !sessionKey) return
    void load()
  }, [ready, sessionKey, load])

  const connectedCount = useMemo(
    () =>
      MODEL_PROVIDERS.filter((meta) => {
        const profile = profileForProvider(models, meta.id)
        return isProviderConnected(profile, meta)
      }).length,
    [models],
  )

  const visibleProviders = useMemo(() => {
    return MODEL_PROVIDERS.filter((meta) => {
      const profile = profileForProvider(models, meta.id)
      const connected = isProviderConnected(profile, meta)
      if (filter === "connected") return connected
      if (filter === "not-connected") return !connected
      return true
    })
  }, [models, filter])

  const sheetProfile = sheetMeta ? profileForProvider(models, sheetMeta.id) : undefined

  const subtitle = loading
    ? "Loading providers…"
    : `${connectedCount} of ${MODEL_PROVIDERS.length} connected`

  const onRefresh = useCallback(() => {
    void load({ refresh: true })
  }, [load])

  const onChangeFilter = useCallback((id: ModelsFilterId) => {
    setFilter(id)
  }, [])

  const onAddProvider = useCallback(() => {
    setShowAddSheet(true)
  }, [])

  useEffect(() => {
    if (!setChrome) return
    setChrome({
      subtitle,
      filter,
      connectedCount,
      totalCount: MODEL_PROVIDERS.length,
      loading,
      refreshing,
      onRefresh,
      onChangeFilter,
      onAddProvider,
    })
    return () => setChrome(null)
  }, [
    setChrome,
    subtitle,
    filter,
    connectedCount,
    loading,
    refreshing,
    onRefresh,
    onChangeFilter,
    onAddProvider,
  ])

  async function pickForChat(profile: ModelProfile) {
    const conn = connectionRef.current
    if (!conn) return
    setBusyId(profile.id)
    setError(null)
    setMessage(null)
    const meta = providerMetaFor(profile.provider)
    const model = chatModelForProfile(profile, meta)
    try {
      await setChatSelection(conn, { profileId: profile.id, model })
      setActiveProfileId(profile.id)
      const role = conn.user.role
      if (role === "OWNER" || role === "ADMIN") {
        try {
          await setDefaultModelProfile(conn, profile.id)
          setModels((prev) => prev.map((m) => ({ ...m, isDefault: m.id === profile.id })))
        } catch {
          /* chat selection saved; instance default is optional */
        }
      }
      setMessage(`${profile.displayName} is now your active model for chat.`)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  function openConnect(meta: ProviderMeta) {
    setSheetMeta(meta)
  }

  return (
    <>
      {showAddSheet ? (
        <MobileAddProviderSheet
          open
          onClose={() => setShowAddSheet(false)}
          onSaved={() => void load({ refresh: true })}
        />
      ) : null}

      {sheetMeta ? (
        <MobileConnectSheet
          meta={sheetMeta}
          profile={sheetProfile}
          open
          onClose={() => setSheetMeta(null)}
          onSaved={() => void load({ refresh: true })}
        />
      ) : null}

      <div className="flex flex-col gap-4 pb-6 pt-0">
        {error ? (
          <p
            className="rounded-xl px-4 py-3 text-[12px] text-[#b91c1c]"
            style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
          >
            {error}
          </p>
        ) : null}
        {message ? (
          <p
            className="rounded-xl px-4 py-3 text-[12px] text-[#15803d]"
            style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
          >
            {message}
          </p>
        ) : null}

        {loading ? (
          <MobileModelsListSkeleton count={MODEL_PROVIDERS.length} />
        ) : visibleProviders.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl bg-white py-12"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <p className="text-[13px] text-[#717171]">
              {filter === "connected"
                ? "No connected providers yet."
                : filter === "not-connected"
                  ? "All providers are connected."
                  : "No providers in catalog."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleProviders.map((meta) => {
              const profile = profileForProvider(models, meta.id)
              const connected = isProviderConnected(profile, meta)
              return (
                <MobileProviderCard
                  key={meta.id}
                  meta={meta}
                  profile={profile}
                  isActive={Boolean(connected && profile?.id === activeProfileId)}
                  isBusy={profile ? busyId === profile.id : false}
                  onUse={() => profile && void pickForChat(profile)}
                  onConnect={() => openConnect(meta)}
                  onConfigure={() => openConnect(meta)}
                />
              )
            })}
          </div>
        )}

        <p className="text-center text-[11px] leading-relaxed text-[#c0c0c0]">
          API keys are stored on your Arciin server only. Connect providers here or on desktop — both
          use the same instance.
        </p>
      </div>
    </>
  )
}
