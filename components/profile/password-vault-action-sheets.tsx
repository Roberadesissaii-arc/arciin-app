"use client"

import { useRef, useState } from "react"
import {
  ClipboardPaste,
  FileUp,
  FingerprintPattern,
  KeyRound,
  Loader2,
  Plus,
} from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import { formatApiError } from "@/lib/api/errors"
import {
  createPasswordVaultEntry,
  importPasswordVault,
} from "@/lib/api/password-vault"
import type { MobileConnection } from "@/lib/types/api"
import type { PasswordEntryDraft } from "@/lib/password-vault/import-text"
import { mobileInputClass, mobileTextareaClass } from "@/lib/ui/mobile-input"

function ActionCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ElementType
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="accent-link-card flex w-full items-start gap-3.5 rounded-2xl p-4 text-left active:opacity-90"
    >
      <div className="accent-icon-tile flex size-11 shrink-0 items-center justify-center rounded-2xl">
        <Icon className="text-accent size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#222222]">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#717171]">{description}</p>
      </div>
    </button>
  )
}

export function PasswordVaultChooserSheet({
  open,
  onClose,
  onAddManual,
  onImport,
}: {
  open: boolean
  onClose: () => void
  onAddManual: () => void
  onImport: () => void
}) {
  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="Add to vault"
      description="Save credentials on this phone — no desktop required."
    >
      <div className="flex flex-col gap-3 pb-2">
        <ActionCard
          icon={KeyRound}
          title="Add password"
          description="Enter site name, username, password, and URL manually."
          onClick={() => {
            onClose()
            onAddManual()
          }}
        />
        <ActionCard
          icon={FileUp}
          title="Import from file"
          description="CSV, JSON, or Bitwarden export — paste or pick a file."
          onClick={() => {
            onClose()
            onImport()
          }}
        />
      </div>
    </MobileBottomSheet>
  )
}

export function PasswordVaultAddEntrySheet({
  open,
  onClose,
  connection,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  connection: MobileConnection
  onSaved: (message: string) => void
}) {
  const [draft, setDraft] = useState<PasswordEntryDraft>({
    name: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    category: "",
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setDraft({ name: "", username: "", password: "", url: "", notes: "", category: "" })
    setError(null)
  }

  async function submit() {
    if (!draft.name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const result = await createPasswordVaultEntry(connection, draft)
      reset()
      onClose()
      onSaved(
        result.imported === 1 ? "Password saved." : `Saved ${result.imported} entries.`,
      )
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <MobileBottomSheet
      open={open}
      onClose={() => {
        if (!busy) {
          reset()
          onClose()
        }
      }}
      title="New password"
      description="Stored encrypted on your Arciin server."
    >
      {error ? (
        <p className="mb-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 pb-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Name *
          </span>
          <input
            className={mobileInputClass}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. GitHub"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Username
          </span>
          <input
            className={mobileInputClass}
            value={draft.username ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
            placeholder="you@example.com"
            autoComplete="username"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Password
          </span>
          <input
            className={mobileInputClass}
            type="password"
            value={draft.password ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            URL
          </span>
          <input
            className={mobileInputClass}
            value={draft.url ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            placeholder="https://…"
            autoComplete="url"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Notes
          </span>
          <input
            className={mobileInputClass}
            value={draft.notes ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            placeholder="Optional"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          disabled={busy || !draft.name.trim()}
          onClick={() => void submit()}
          className="btn-accent-solid mt-1 flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Save password
        </button>
      </div>
    </MobileBottomSheet>
  )
}

export function PasswordVaultImportSheet({
  open,
  onClose,
  connection,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  connection: MobileConnection
  onSaved: (message: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pasteText, setPasteText] = useState("")
  const [replaceVault, setReplaceVault] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runImport(text: string, fileName?: string) {
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    try {
      const result = await importPasswordVault(connection, {
        text,
        fileName,
        replace: replaceVault,
      })
      setPasteText("")
      onClose()
      onSaved(
        `Imported ${result.imported} credential${result.imported === 1 ? "" : "s"}.`,
      )
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function onFileChange(file: File | null) {
    if (!file) return
    const text = await file.text()
    await runImport(text, file.name)
  }

  return (
    <MobileBottomSheet
      open={open}
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Import passwords"
      description="CSV, pipe-separated rows, or Bitwarden JSON."
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,.txt,application/json,text/csv,text/plain"
        className="hidden"
        onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
      />

      {error ? (
        <p className="mb-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pb-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#e5e5e5] bg-white text-[14px] font-semibold text-[#222222] active:bg-[#f7f7f7] disabled:opacity-50"
        >
          <FileUp className="text-accent size-4" />
          Choose file
        </button>

        <div className="relative">
          <ClipboardPaste className="pointer-events-none absolute left-3 top-3 size-4 text-[#a0a0a0]" />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Or paste export text here…"
            rows={5}
            className={`${mobileTextareaClass} py-3 pl-10 pr-3`}
          />
        </div>

        <label className="flex items-center gap-2.5 rounded-xl bg-[#fafafa] px-3 py-2.5" style={{ border: "1px solid #ececec" }}>
          <input
            type="checkbox"
            checked={replaceVault}
            onChange={(e) => setReplaceVault(e.target.checked)}
            className="size-4"
            style={{ accentColor: "var(--arciin-accent, #ff4f12)" }}
          />
          <span className="text-[12px] text-[#717171]">Replace existing vault entries on import</span>
        </label>

        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-[#a0a0a0]">
          <FingerprintPattern className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Supports title/username/password/url CSV, pipe rows, and Bitwarden JSON exports.
          </span>
        </p>

        <button
          type="button"
          disabled={busy || !pasteText.trim()}
          onClick={() => void runImport(pasteText, "paste.txt")}
          className="btn-accent-solid flex h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Import pasted text
        </button>
      </div>
    </MobileBottomSheet>
  )
}
