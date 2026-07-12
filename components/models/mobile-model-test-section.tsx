"use client"

import { useEffect, useState } from "react"
import { FlaskConical, Loader2, X } from "lucide-react"

import { useConnection } from "@/components/providers/connection-provider"
import { formatApiError } from "@/lib/api/errors"
import { getAvailableModels, testModelProfile } from "@/lib/api/models"

const DEFAULT_PROMPT = "Say hello from Arciin."

/**
 * Free-tier connection test for connected Ollama profiles — one short prompt,
 * one short reply. Proves the key / local daemon works without full AI Chat.
 * Auto-picks a model that is actually installed/available so the test never
 * blocks on an unset profile default.
 */
export function MobileModelTestSection({ profileId }: { profileId: string }) {
  const { connection } = useConnection()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [reply, setReply] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [model, setModel] = useState<string | null>(null)
  const [loadingModel, setLoadingModel] = useState(false)

  useEffect(() => {
    if (!open || !connection || model || loadingModel) return
    setLoadingModel(true)
    getAvailableModels(connection, profileId)
      .then((result) => setModel(result.models[0] ?? null))
      .catch(() => setModel(null))
      .finally(() => setLoadingModel(false))
  }, [open, connection, profileId, model, loadingModel])

  async function run() {
    if (!connection || !model) return
    setRunning(true)
    setError(null)
    setReply(null)
    try {
      const result = await testModelProfile(connection, profileId, {
        prompt: prompt.trim() || DEFAULT_PROMPT,
        model,
      })
      setReply(result.reply)
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setRunning(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-medium text-[#717171] active:bg-[#f7f7f7]"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <FlaskConical className="size-3.5" />
        Test
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl bg-[#f7f7f7] p-3" style={{ border: "1px solid #ececec" }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-[#222222]">Test this model</p>
          <p className="mt-0.5 text-[11px] text-[#a0a0a0]">
            {loadingModel
              ? "Checking which models are installed…"
              : model
                ? `Ask a quick prompt to confirm your connection works — using ${model}.`
                : "Ask a quick prompt to confirm your connection works."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setReply(null)
            setError(null)
          }}
          aria-label="Close test panel"
          className="shrink-0 p-1 text-[#a0a0a0] active:text-[#717171]"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !running && model) void run()
          }}
          placeholder={DEFAULT_PROMPT}
          maxLength={200}
          className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-[13px] text-[#222222] outline-none placeholder:text-[#c0c0c0]"
          style={{ border: "1px solid #e5e5e5" }}
        />
        <button
          type="button"
          disabled={running || loadingModel || !model}
          onClick={() => void run()}
          className="btn-accent-solid flex shrink-0 items-center justify-center rounded-xl px-4 text-[12px] font-semibold disabled:opacity-50"
        >
          {running || loadingModel ? <Loader2 className="size-4 animate-spin" /> : "Run"}
        </button>
      </div>

      {!loadingModel && !model ? (
        <p
          className="mt-2 rounded-xl bg-[#fffbeb] px-3 py-2 text-[12px] text-[#b45309]"
          style={{ border: "1px solid #fde68a" }}
        >
          No installed models found on this connection. Pull a model on the server, then reopen
          this panel.
        </p>
      ) : null}

      {reply ? (
        <div
          className="mt-2 max-h-36 overflow-y-auto rounded-xl bg-[#f0fdf4] px-3 py-2"
          style={{ border: "1px solid #bbf7d0" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#15803d]">
            Connection works
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-[#222222]">
            {reply}
          </p>
        </div>
      ) : null}

      {error ? (
        <p
          className="mt-2 rounded-xl bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]"
          style={{ border: "1px solid #fecaca" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
