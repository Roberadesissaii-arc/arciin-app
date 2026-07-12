"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { MobileModelsListSkeleton } from "@/components/models/mobile-provider-card-skeleton"

import { MobileAddProviderSheet } from "@/components/models/mobile-add-provider-sheet"
import { MobileConnectSheet } from "@/components/models/mobile-connect-sheet"
import { MobileProviderCard } from "@/components/models/mobile-provider-card"
import { useModelsChromeOptional } from "@/components/models/models-chrome-context"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { PageFetchErrorAlert } from "@/components/shell/page-fetch-error-alert"
import { useConnection } from "@/components/providers/connection-provider"
import { suppressFetchErrorWhenOffline } from "@/lib/connection/offline-ui"
import { getChatSelection, setChatSelection } from "@/lib/api/chat"
import { writeLocalChatSelection } from "@/lib/chat/chat-selection-storage"
import { formatApiError } from "@/lib/api/errors"
import { getLicenseStatus } from "@/lib/api/license"
import { getModelProfiles, setDefaultModelProfile } from "@/lib/api/models"
import type { ModelsFilterId } from "@/lib/models/filter-config"
import {
  chatModelForProfile,
  isProviderConnected,
  profileForProvider,
} from "@/lib/models/model-helpers"
import { providerMetaFor } from "@/lib/models/provider-catalog"
import { MODEL_PROVIDERS, type ProviderMeta } from "@/lib/models/provider-catalog"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import type { ModelProfile } from "@/lib/types/models"

/** Providers usable without a paid plan — must match the desktop Models page. */
const FREE_PROVIDER_IDS = new Set(["ollama-local", "ollama-cloud"])

const MODELS_STALE_MS = 60_000
type ModelsCacheEntry = {
  models: ModelProfile[]
  multiProvider: boolean
  activeProfileId: string | null
  fetchedAt: number
}
const modelsCache = new Map<string, ModelsCacheEntry>()

export function MobileModelsPage() {
  const { connection, ready, serverReachable } = useConnection()
  const serverOnline = serverReachable !== false
  const setChrome = useModelsChromeOptional()?.setChrome
  const connectionRef = useRef(connection)
  connectionRef.current = connection

  const sessionKey = connection?.sessionToken ?? null
  const cached = sessionKey ? modelsCache.get(sessionKey) : undefined

  const [models, setModels] = useState<ModelProfile[]>(() => cached?.models ?? [])
  const [multiProvider, setMultiProvider] = useState(() => cached?.multiProvider ?? false)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(
    () => cached?.activeProfileId ?? null,
  )
  const [filter, setFilter] = useState<ModelsFilterId>("all")
  // Skip the skeleton on revisit — render cached data instantly and revalidate quietly.
  const [loading, setLoading] = useState(() => !cached)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage()
  const [sheetMeta, setSheetMeta] = useState<ProviderMeta | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)

  const load = useCallback(async (opts?: { refresh?: boolean; background?: boolean }) => {
    const conn = connectionRef.current
    if (!conn) return
    if (opts?.refresh) setRefreshing(true)
    else if (!opts?.background) setLoading(true)
    setError(null)
    try {
      const [list, selection, license] = await Promise.all([
        getModelProfiles(conn),
        getChatSelection(conn).catch(() => null),
        // Deny premium providers until the server confirms the plan — same as desktop.
        getLicenseStatus(conn).catch(() => null),
      ])
      const nextMultiProvider = Boolean(
        license?.features.some((f) => f.id === "ai.multi_provider"),
      )
      setModels(list)
      setMultiProvider(nextMultiProvider)
      let nextActiveProfileId: string | null = null
      if (selection) {
        nextActiveProfileId = selection.profileId
      } else {
        const def = list.find((m) => m.isDefault) ?? list[0]
        nextActiveProfileId = def?.id ?? null
      }
      if (nextActiveProfileId) setActiveProfileId(nextActiveProfileId)
      if (conn.sessionToken) {
        modelsCache.set(conn.sessionToken, {
          models: list,
          multiProvider: nextMultiProvider,
          activeProfileId: nextActiveProfileId,
          fetchedAt: Date.now(),
        })
      }
    } catch (err) {
      setError(suppressFetchErrorWhenOffline(serverReachable, formatApiError(err)))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [serverReachable])

  useEffect(() => {
    if (!ready || !sessionKey) return
    if (!serverOnline) {
      setLoading(false)
      setRefreshing(false)
      setError(null)
      return
    }
    const fresh = cached != null && Date.now() - cached.fetchedAt <= MODELS_STALE_MS
    if (fresh) return
    void load({ background: cached != null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cached is a read of a module map, not reactive state
  }, [ready, sessionKey, serverOnline, load])

  useEffect(() => {
    if (serverReachable === false) setError(null)
  }, [serverReachable])

  const connectedCount = useMemo(
    () =>
      MODEL_PROVIDERS.filter((meta) => {
        // Locked premium providers do not count as connected on Free —
        // a profile saved on a paid plan must not read as usable.
        if (!multiProvider && !FREE_PROVIDER_IDS.has(meta.id)) return false
        const profile = profileForProvider(models, meta.id)
        return isProviderConnected(profile, meta)
      }).length,
    [models, multiProvider],
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

  const subtitle = !serverOnline
    ? "Server disconnected"
    : loading
      ? "Loading providers…"
      : `${connectedCount} of ${MODEL_PROVIDERS.length} connected`

  const onRefresh = useCallback(() => {
    void load({ refresh: true })
  }, [load])

  const onChangeFilter = useCallback((id: ModelsFilterId) => {
    setFilter(id)
  }, [])

  const onAddProvider = useCallback(() => {
    if (!serverOnline) return
    setShowAddSheet(true)
  }, [serverOnline])

  useEffect(() => {
    if (!setChrome) return
    setChrome({
      subtitle,
      filter,
      connectedCount,
      totalCount: MODEL_PROVIDERS.length,
      loading,
      refreshing,
      serverOnline,
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
    serverOnline,
    onRefresh,
    onChangeFilter,
    onAddProvider,
  ])

  async function pickForChat(profile: ModelProfile) {
    const conn = connectionRef.current
    if (!conn) return
    setBusyId(profile.id)
    setError(null)
    clearStatus()
    const meta = providerMetaFor(profile.provider)
    const model = chatModelForProfile(profile, meta)
    try {
      writeLocalChatSelection(profile.id, model)
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
      showStatus(`${profile.displayName} is now your active model for chat.`)
    } catch (err) {
      setError(suppressFetchErrorWhenOffline(serverReachable, formatApiError(err)))
    } finally {
      setBusyId(null)
    }
  }

  function isProviderLocked(providerId: string) {
    if (multiProvider) return false
    // Free / basic BYOK: Ollama Local + Ollama Cloud only — matches desktop.
    return !FREE_PROVIDER_IDS.has(providerId)
  }

  function openConnect(meta: ProviderMeta) {
    if (!serverOnline) return
    if (isProviderLocked(meta.id)) return
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
        <PageFetchErrorAlert error={error} onRetry={() => void load({ refresh: true })} />
        <PanelStatusBanner message={message} />

        {!loading && serverOnline && !multiProvider ? (
          <div
            className="rounded-2xl bg-white px-4 py-3 text-[12px] leading-relaxed text-[#717171]"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <span className="font-semibold text-[#222222]">Free plan: </span>
            You can connect and test one{" "}
            <span className="font-medium text-[#222222]">Ollama Local</span> or{" "}
            <span className="font-medium text-[#222222]">Ollama Cloud</span> model. Full AI
            Chat, Ask AI on files, PDF Q&amp;A, image understanding, and multiple providers are
            available on{" "}
            <Link href="/profile" className="text-accent font-semibold">
              Pro
            </Link>
            .
          </div>
        ) : null}

        {!serverOnline && !loading ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-10"
            style={{ border: "1px solid #e5e5e5" }}
          >
            <p className="text-center text-[13px] leading-relaxed text-[#717171]">
              Server disconnected. Reconnect from the banner above or Profile → Change server.
            </p>
          </div>
        ) : loading ? (
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
                  locked={isProviderLocked(meta.id)}
                  testable={FREE_PROVIDER_IDS.has(meta.id)}
                  onUse={() => profile && void pickForChat(profile)}
                  serverOnline={serverOnline}
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
