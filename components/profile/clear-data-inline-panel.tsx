"use client"

import { useState } from "react"
import { Eraser, Loader2 } from "lucide-react"

import { AdminSettingsGate } from "@/components/settings/admin-settings-gate"
import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { PanelStatusBanner } from "@/components/settings/panel-status-banner"
import { SettingsIntroCard } from "@/components/settings/settings-intro-card"
import { MutedPanelError } from "@/components/shell/muted-panel-error"
import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { clearInstanceData } from "@/lib/api/settings"
import { usePanelStatusMessage } from "@/lib/hooks/use-panel-status-message"

const CONFIRM_PHRASE = "CLEAR INSTANCE DATA"

function CheckboxRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0"
        style={{ accentColor: "var(--arciin-accent, #ff4f12)" }}
      />
      <span>
        <span className="text-[13px] font-medium text-[#222222]">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-[#717171]">{description}</span>
      </span>
    </label>
  )
}

function ClearDataForm() {
  const { connection } = useConnection()
  const [clearMedia, setClearMedia] = useState(true)
  const [clearChat, setClearChat] = useState(true)
  const [clearAppData, setClearAppData] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { message, showStatus, clearStatus } = usePanelStatusMessage()

  const canOpenConfirm =
    password.length > 0 && (clearMedia || clearChat || clearAppData) && !busy

  async function handleClear() {
    if (!connection || confirmText !== CONFIRM_PHRASE) return
    setBusy(true)
    setError(null)
    clearStatus()
    try {
      await clearInstanceData(connection, {
        password,
        clearChat,
        clearMedia,
        clearAppData,
      })
      setPassword("")
      setConfirmText("")
      setConfirmOpen(false)
      showStatus("Selected data was cleared.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SettingsIntroCard
        icon={Eraser}
        title="Data reset"
        description="Same as desktop Settings → Data reset. Removes uploads, chat, and optional app databases. Users, libraries config, and API keys are kept."
      />

      <div
        className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-3"
        role="note"
      >
        <p className="text-[12px] leading-relaxed text-[#92400e]">
          This cannot be undone. Requires your account password and a confirmation phrase.
        </p>
      </div>

      <div className="rounded-xl bg-[#f7f7f7] px-3 py-2" style={{ border: "1px solid #e5e5e5" }}>
        <p className="py-2 text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
          What to clear
        </p>
        <CheckboxRow
          label="Media & libraries"
          description="Assets, folders, uploads, jobs, and activity events."
          checked={clearMedia}
          onChange={setClearMedia}
          disabled={busy}
        />
        <div className="h-px bg-[#ececec]" />
        <CheckboxRow
          label="Chat"
          description="All conversations and messages for every user."
          checked={clearChat}
          onChange={setClearChat}
          disabled={busy}
        />
        <div className="h-px bg-[#ececec]" />
        <CheckboxRow
          label="App Data databases"
          description="Custom databases under App Data — not library file storage."
          checked={clearAppData}
          onChange={setClearAppData}
          disabled={busy}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="clear-data-password" className="text-[12px] font-semibold text-[#717171]">
          Your password
        </label>
        <input
          id="clear-data-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Confirm you are allowed to do this"
          className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none placeholder:text-[#c0c0c0]"
          style={{ border: "1px solid #e5e5e5" }}
        />
      </div>

      <button
        type="button"
        disabled={!canOpenConfirm}
        onClick={() => {
          setConfirmText("")
          setConfirmOpen(true)
        }}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#dc2626] text-[14px] font-semibold text-white disabled:opacity-50"
      >
        <Eraser className="size-4" />
        Clear selected data…
      </button>

      <PanelStatusBanner message={message} />
      {error ? <MutedPanelError error={error} /> : null}

      <MobileBottomSheet
        open={confirmOpen}
        onClose={() => !busy && setConfirmOpen(false)}
        title="Clear instance data?"
        description={`Type ${CONFIRM_PHRASE} exactly to confirm.`}
      >
        <div className="flex flex-col gap-4">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            placeholder={CONFIRM_PHRASE}
            className="rounded-xl bg-[#f7f7f7] px-4 py-3 font-mono text-[13px] outline-none"
            style={{ border: "1px solid #e5e5e5" }}
          />
          <button
            type="button"
            disabled={confirmText !== CONFIRM_PHRASE || busy}
            onClick={() => void handleClear()}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#dc2626] text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? "Clearing…" : "Confirm clear"}
          </button>
        </div>
      </MobileBottomSheet>
    </>
  )
}

export function ClearDataInlinePanel({ enabled }: { enabled: boolean }) {
  if (!enabled) return null

  return (
    <AdminSettingsGate feature="Data reset">
      <div className="flex flex-col gap-4">
        <ClearDataForm />
      </div>
    </AdminSettingsGate>
  )
}
