"use client"

import { useCallback, useRef, useState } from "react"
import { Loader2, Lock, ShieldCheck, Sparkles } from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { OfflineCachedNotice } from "@/components/settings/offline-cached-notice"
import { MobilePillSwitch } from "@/components/settings/mobile-toggle-row"
import { MobileSettingsSegment } from "@/components/settings/mobile-segment"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { formatApiError } from "@/lib/api/errors"
import {
  getAiSecuritySettings,
  getAiSettings,
  updateAiSecuritySettings,
  updateAiSettings,
} from "@/lib/api/settings"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"
import { useStablePanelLoad } from "@/lib/hooks/use-stable-panel-load"
import type { AiSecuritySettings, AiSettings } from "@/lib/types/models"

const VAULT_AI_ENCRYPTED = "[VAULT_ENCRYPTED]"

const EMOJI_OPTIONS = [
  { label: "None", value: "none" as const, hint: "No emojis in AI replies" },
  { label: "Low", value: "low" as const, hint: "At most one emoji per message when helpful" },
  { label: "Medium", value: "medium" as const, hint: "Occasional emojis for readability" },
  { label: "High", value: "high" as const, hint: "Emojis allowed freely where they fit" },
]

const DEFAULT_VAULT_SHARE: AiSecuritySettings["passwordVaultAiShare"] = {
  names: true,
  usernames: true,
  urls: true,
  notes: false,
}

function mergeSecurityPatch(
  security: AiSecuritySettings,
  patch: Partial<AiSecuritySettings>,
): AiSecuritySettings {
  const next: AiSecuritySettings = {
    ...security,
    ...patch,
    passwordVaultAiShare: {
      ...security.passwordVaultAiShare,
      ...patch.passwordVaultAiShare,
    },
  }
  if (patch.libraryToolAccess !== undefined) {
    next.libraryToolAccess = patch.libraryToolAccess
    next.readOnlyTools = patch.libraryToolAccess === "vision_only"
  }
  return next
}

function AiSettingsForm({ enabled }: { enabled: boolean }) {
  const load = useCallback(
    async (connection: Parameters<typeof getAiSettings>[0], signal: AbortSignal) => {
      const [ai, security] = await Promise.all([
        getAiSettings(connection, signal),
        getAiSecuritySettings(connection, signal),
      ])
      return {
        ai,
        security: {
          ...security,
          passwordVaultAiShare: security.passwordVaultAiShare ?? DEFAULT_VAULT_SHARE,
          passwordQueriesLocalAiOnly: security.passwordQueriesLocalAiOnly ?? false,
        },
      }
    },
    [],
  )

  const {
    data,
    loading,
    error,
    showingCachedOffline,
    isRevalidating,
    connection,
    setData,
    reload,
  } = useStablePanelLoad(enabled, load, { cacheKey: "ai-settings" })

  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const [saving, setSaving] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage(enabled)

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-[#c0c0c0]" />
      </div>
    )
  }

  if (!data) {
    return <MutedPanelError error={patchError ?? error} onRetry={() => void reload()} />
  }

  const ai = data.ai
  const security: AiSecuritySettings = {
    ...data.security,
    passwordVaultAiShare: data.security.passwordVaultAiShare ?? DEFAULT_VAULT_SHARE,
    passwordQueriesLocalAiOnly: data.security.passwordQueriesLocalAiOnly ?? false,
  }
  const busy = saving
  const emojiMeta = EMOJI_OPTIONS.find((o) => o.value === ai.emojiUsage) ?? EMOJI_OPTIONS[0]

  async function saveAi(patch: Partial<AiSettings>, successMessage: string) {
    const conn = connectionRef.current
    if (!conn) return
    setSaving(true)
    setPatchError(null)
    clearStatus()
    const prev = data
    setData({ ai: { ...ai, ...patch }, security })
    try {
      const updated = await updateAiSettings(conn, patch)
      setData({ ai: updated, security })
      showStatus(successMessage)
    } catch (err) {
      if (prev) setData(prev)
      setPatchError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function saveSecurity(patch: Partial<AiSecuritySettings>, successMessage: string) {
    const conn = connectionRef.current
    if (!conn) return
    setSaving(true)
    setPatchError(null)
    clearStatus()
    const prev = data
    setData({ ai, security: mergeSecurityPatch(security, patch) })
    try {
      const updated = await updateAiSecuritySettings(conn, patch)
      setData({
        ai,
        security: {
          ...updated,
          passwordVaultAiShare: updated.passwordVaultAiShare ?? DEFAULT_VAULT_SHARE,
          passwordQueriesLocalAiOnly: updated.passwordQueriesLocalAiOnly ?? false,
        },
      })
      showStatus(successMessage)
    } catch (err) {
      if (prev) setData(prev)
      setPatchError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showingCachedOffline ? <OfflineCachedNotice revalidating={isRevalidating} /> : null}

      <SettingsIntroCard
        icon={Sparkles}
        title="AI planning"
        description="Agent behaviour — same as desktop Settings → Planning."
      />

      <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
        <MobilePillSwitch
          label="AI agent"
          hint="Enable server tools so the AI can organize and search your library"
          on={ai.agent}
          disabled={busy}
          onChange={() => {
            const next = !ai.agent
            void saveAi({ agent: next }, next ? "AI agent enabled" : "AI agent disabled")
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Autonomy"
          hint={
            ai.agent
              ? "Run multi-step library actions without asking at each step"
              : "Turn on AI agent to use autonomy"
          }
          on={ai.autonomy}
          disabled={busy || !ai.agent}
          onChange={() => {
            const next = !ai.autonomy
            void saveAi({ autonomy: next }, next ? "Autonomy enabled" : "Autonomy disabled")
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Planning"
          hint="Outline a plan before complex multi-step tasks"
          on={ai.planning}
          disabled={busy}
          onChange={() => {
            const next = !ai.planning
            void saveAi({ planning: next }, next ? "Planning enabled" : "Planning disabled")
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Show thinking"
          hint="Show the model reasoning trace live above the answer while it streams"
          on={ai.showThinking}
          disabled={busy}
          onChange={() => {
            const next = !ai.showThinking
            void saveAi({ showThinking: next }, next ? "Thinking visible" : "Thinking hidden")
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <div className="py-3">
          <p className="text-[13px] font-medium text-[#222222]">Emoji usage</p>
          <p className="mt-0.5 text-[11px] text-[#717171]">{emojiMeta.hint}</p>
          <div className="mt-2">
            <MobileSettingsSegment
              label=""
              options={EMOJI_OPTIONS}
              value={ai.emojiUsage}
              disabled={busy}
              onChange={(value) => {
                if (value === ai.emojiUsage) return
                const label = EMOJI_OPTIONS.find((o) => o.value === value)?.label ?? value
                void saveAi({ emojiUsage: value }, `Emoji usage set to ${label}`)
              }}
            />
          </div>
        </div>
      </div>

      <SettingsIntroCard
        icon={ShieldCheck}
        title="AI security"
        description="Injection filtering and redaction — same as desktop Settings → AI Security."
      />

      <div className="rounded-xl bg-[#f7f7f7] px-3 py-1" style={{ border: "1px solid #e5e5e5" }}>
        <MobilePillSwitch
          label="Block prompt injection"
          hint="Neutralize common jailbreak phrases in user messages"
          on={security.blockInjection}
          disabled={busy}
          onChange={() => {
            const next = !security.blockInjection
            void saveSecurity(
              { blockInjection: next },
              next ? "Injection filter on" : "Injection filter off",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Redact secrets"
          hint="Strip API keys, tokens, and bearer strings from outbound chat"
          on={security.redactSecrets}
          disabled={busy}
          onChange={() => {
            const next = !security.redactSecrets
            void saveSecurity(
              { redactSecrets: next },
              next ? "Secret redaction on" : "Secret redaction off",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Redact PII"
          hint="Mask emails, phone numbers, and SSN-like patterns in outbound chat"
          on={security.redactPII}
          disabled={busy}
          onChange={() => {
            const next = !security.redactPII
            void saveSecurity({ redactPII: next }, next ? "PII redaction on" : "PII redaction off")
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobileSettingsSegment
          label="Library tool access"
          options={[
            { label: "Full", value: "full" as const },
            { label: "Sandbox", value: "sandbox" as const },
            { label: "Read-only", value: "vision_only" as const },
          ]}
          value={security.libraryToolAccess}
          disabled={busy}
          onChange={(value) => {
            if (value === security.libraryToolAccess) return
            void saveSecurity({ libraryToolAccess: value }, "Library access updated")
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Require tool approval"
          hint="Disable automatic organize/search actions until the user clearly asks"
          on={security.requireToolApproval}
          disabled={busy}
          onChange={() => {
            const next = !security.requireToolApproval
            void saveSecurity(
              { requireToolApproval: next },
              next ? "Tool approval required" : "Tool approval optional",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobileSettingsSegment
          label="Password vault AI access"
          options={[
            { label: "Blocked", value: "blocked" as const },
            { label: "Count only", value: "count_only" as const },
            { label: "Metadata", value: "metadata" as const },
          ]}
          value={security.passwordVaultAiAccess}
          disabled={busy}
          onChange={(value) => {
            if (value === security.passwordVaultAiAccess) return
            void saveSecurity({ passwordVaultAiAccess: value }, "Vault AI access updated")
          }}
        />
        {security.passwordVaultAiAccess === "metadata" ? (
          <>
            <div className="h-px bg-[#ececec]" />
            <p className="py-2 text-[10px] leading-relaxed text-[#717171]">
              Passwords always appear as {VAULT_AI_ENCRYPTED} for the assistant — never decrypted.
            </p>
            <MobilePillSwitch
              label="Send entry names to AI"
              hint="Site titles such as Docker Hub Engine"
              on={security.passwordVaultAiShare.names}
              disabled={busy}
              onChange={() =>
                void saveSecurity(
                  {
                    passwordVaultAiShare: {
                      ...security.passwordVaultAiShare,
                      names: !security.passwordVaultAiShare.names,
                    },
                  },
                  "Vault name sharing updated",
                )
              }
            />
            <div className="h-px bg-[#ececec]" />
            <MobilePillSwitch
              label="Send usernames to AI"
              hint={`When off, AI sees ${VAULT_AI_ENCRYPTED} instead of the login`}
              on={security.passwordVaultAiShare.usernames}
              disabled={busy}
              onChange={() =>
                void saveSecurity(
                  {
                    passwordVaultAiShare: {
                      ...security.passwordVaultAiShare,
                      usernames: !security.passwordVaultAiShare.usernames,
                    },
                  },
                  "Vault username sharing updated",
                )
              }
            />
            <div className="h-px bg-[#ececec]" />
            <MobilePillSwitch
              label="Send URLs to AI"
              hint={`When off, AI sees ${VAULT_AI_ENCRYPTED} instead of the link`}
              on={security.passwordVaultAiShare.urls}
              disabled={busy}
              onChange={() =>
                void saveSecurity(
                  {
                    passwordVaultAiShare: {
                      ...security.passwordVaultAiShare,
                      urls: !security.passwordVaultAiShare.urls,
                    },
                  },
                  "Vault URL sharing updated",
                )
              }
            />
            <div className="h-px bg-[#ececec]" />
            <MobilePillSwitch
              label="Send notes to AI"
              hint="Short notes only; off sends encrypted token"
              on={security.passwordVaultAiShare.notes}
              disabled={busy}
              onChange={() =>
                void saveSecurity(
                  {
                    passwordVaultAiShare: {
                      ...security.passwordVaultAiShare,
                      notes: !security.passwordVaultAiShare.notes,
                    },
                  },
                  "Vault note sharing updated",
                )
              }
            />
          </>
        ) : null}
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Password chat: local AI only"
          hint="Password-related chat questions use Ollama only — never cloud APIs"
          on={security.passwordQueriesLocalAiOnly}
          disabled={busy}
          onChange={() => {
            const next = !security.passwordQueriesLocalAiOnly
            void saveSecurity(
              { passwordQueriesLocalAiOnly: next },
              next ? "Password chat local-only on" : "Password chat local-only off",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Hide library names"
          hint='Use generic labels such as "Library 1" instead of real names'
          on={security.hideLibraryNames}
          disabled={busy}
          onChange={() => {
            const next = !security.hideLibraryNames
            void saveSecurity(
              { hideLibraryNames: next },
              next ? "Library names hidden" : "Library names visible",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Hide asset counts"
          hint="Omit per-library and per-type file counts from chat context"
          on={security.hideAssetCounts}
          disabled={busy}
          onChange={() => {
            const next = !security.hideAssetCounts
            void saveSecurity(
              { hideAssetCounts: next },
              next ? "Asset counts hidden" : "Asset counts visible",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Hide storage usage"
          hint="Do not share total storage used with AI providers"
          on={security.hideStorageSize}
          disabled={busy}
          onChange={() => {
            const next = !security.hideStorageSize
            void saveSecurity(
              { hideStorageSize: next },
              next ? "Storage usage hidden" : "Storage usage visible",
            )
          }}
        />
        <div className="h-px bg-[#ececec]" />
        <MobilePillSwitch
          label="Hide upload dates"
          hint="Exclude the most recent upload timestamp from chat context"
          on={security.hideUploadDates}
          disabled={busy}
          onChange={() => {
            const next = !security.hideUploadDates
            void saveSecurity(
              { hideUploadDates: next },
              next ? "Upload dates hidden" : "Upload dates visible",
            )
          }}
        />
      </div>

      <p className="flex items-start gap-2 px-1 text-[10px] leading-relaxed text-[#a0a0a0]">
        <Lock className="mt-0.5 size-3 shrink-0" />
        Agent, planning, and emoji settings are sent to the server and applied to every chat reply.
        Show thinking only affects how reasoning appears in this app&apos;s chat UI.
      </p>

      <PanelStatusBanner message={message} />
      {patchError ? <MutedPanelError error={patchError} /> : null}
    </div>
  )
}

export function AiSettingsInlinePanel({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  return (
    <AdminSettingsGate feature="AI settings">
      <AiSettingsForm enabled={enabled} />
    </AdminSettingsGate>
  )
}
