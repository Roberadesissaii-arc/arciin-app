"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { MobileBottomSheet } from "@/components/shell/mobile-bottom-sheet"
import type { MobileAccount } from "@/lib/connection/accounts"
import { displayServerLabel } from "@/lib/connection/normalize-url"

export function RemoveServerSheet({
  open,
  account,
  onClose,
  onConfirm,
}: {
  open: boolean
  account: MobileAccount | null
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  function handleClose() {
    if (busy) return
    onClose()
  }

  async function handleRemove() {
    setBusy(true)
    try {
      await onConfirm()
      handleClose()
    } finally {
      setBusy(false)
    }
  }

  if (!account) return null

  return (
    <MobileBottomSheet
      open={open}
      onClose={handleClose}
      title="Remove server?"
      description={`“${account.server.instanceName}” will be removed from this phone. Your Arciin instance on the server is not deleted — you can add it again anytime.`}
      ariaLabel="Remove server"
    >
      <p className="mb-4 font-mono text-[11px] text-[#a0a0a0]">
        {displayServerLabel(account.server.apiBaseUrl, account.server.instanceName)}
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRemove()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#dc2626] text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Remove from this phone
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleClose}
          className="flex h-11 w-full items-center justify-center rounded-xl text-[14px] font-semibold text-[#717171] active:bg-[#f0f0f0]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          Cancel
        </button>
      </div>
    </MobileBottomSheet>
  )
}
