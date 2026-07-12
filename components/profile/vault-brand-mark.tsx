"use client"

import { useMemo, useState } from "react"
import { FingerprintPattern } from "lucide-react"

import type { PasswordVaultEntry } from "@/lib/api/password-vault"
import type { MobileConnection } from "@/lib/types/api"
import { resolveVaultAssetUrlCandidates } from "@/lib/password-vault/asset-url"
import {
  resolveVaultBrand,
  vaultBrandIconCandidates,
  vaultBrandInitials,
  vaultBrandTileBg,
  vaultBrandTileFg,
} from "@/lib/password-vault/vault-brand"
import { cn } from "@/lib/utils"

type VaultBrandMarkProps = {
  entry: Pick<PasswordVaultEntry, "name" | "url" | "username" | "category" | "notes">
  webBase?: string | null
  connection?: Pick<MobileConnection, "apiBaseUrl" | "webUrl"> | null
  size?: "sm" | "md"
  className?: string
  fallbackToVault?: boolean
}

export function VaultBrandMark({
  entry,
  webBase,
  connection,
  size = "md",
  className,
  fallbackToVault = true,
}: VaultBrandMarkProps) {
  const match = resolveVaultBrand(entry)
  const candidates = useMemo(() => {
    if (!match) return []
    return vaultBrandIconCandidates(match).flatMap((path) =>
      resolveVaultAssetUrlCandidates(path, webBase, connection),
    )
  }, [match, webBase, connection])
  const [candidateIdx, setCandidateIdx] = useState(0)
  const [iconFailed, setIconFailed] = useState(false)

  const iconSrc = candidates[candidateIdx] ?? null
  const showImage = Boolean(iconSrc) && !iconFailed
  const tileFg = vaultBrandTileFg(match)

  const box =
    size === "sm" ? "size-10 rounded-xl text-[10px]" : "size-11 rounded-2xl text-[11px]"
  const imageSize = size === "sm" ? "size-5" : "size-6"

  if (!match && fallbackToVault) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-zinc-900 text-white ring-1 ring-black/10",
          box,
          className,
        )}
        aria-hidden
      >
        <FingerprintPattern className="size-5" />
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: vaultBrandTileBg(match),
        color: tileFg,
      }}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden font-bold ring-1 ring-black/10",
        box,
        !match && "bg-zinc-100 text-zinc-600",
        !showImage && match && "text-zinc-800",
        className,
      )}
      aria-hidden
    >
      {showImage ? (
        <img
          key={iconSrc}
          src={iconSrc!}
          alt=""
          width={24}
          height={24}
          className={cn(imageSize, "object-contain")}
          onError={() => {
            if (candidateIdx < candidates.length - 1) {
              setCandidateIdx((i) => i + 1)
              return
            }
            setIconFailed(true)
          }}
        />
      ) : (
        <span>{vaultBrandInitials(match, entry.name)}</span>
      )}
      <span className="sr-only">{match?.label ?? entry.name}</span>
    </div>
  )
}
