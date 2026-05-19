"use client"

import { useEffect, useMemo, useState } from "react"

import { fetchUserAvatarBlob } from "@/lib/api/user-avatar"
import type { MobileConnection } from "@/lib/types/api"
import {
  cacheUserAvatarBlob,
  clearCachedUserAvatar,
  readCachedUserAvatarDataUrl,
} from "@/lib/utils/user-avatar-cache"

type UserAvatarImageProps = {
  connection: MobileConnection
  userId?: string
  /** Hint from API; we still probe by userId when this is missing (stale local session). */
  avatarUrl?: string | null | undefined
  updatedAt?: string
  name?: string
  size?: number
  className?: string
  fallbackClassName?: string
  fallbackTextClassName?: string
  tone?: "dark" | "light"
  /** Match desktop account page (rounded-2xl), not a circle. */
  shape?: "rounded" | "circle"
}

function shapeClass(shape: "rounded" | "circle") {
  return shape === "circle" ? "rounded-full" : "rounded-2xl"
}

export function UserAvatarImage({
  connection,
  userId,
  avatarUrl,
  updatedAt,
  name,
  size = 72,
  className = "",
  fallbackClassName = "",
  fallbackTextClassName = "text-[#ff4f12]",
  tone = "dark",
  shape = "rounded",
}: UserAvatarImageProps) {
  const resolvedUserId = userId ?? connection.user.id
  const letter = (name?.trim()?.[0] ?? connection.user.name?.trim()?.[0] ?? "?").toUpperCase()
  const isDark = tone === "dark"
  const radius = shapeClass(shape)

  const cacheKey = updatedAt ?? avatarUrl ?? connection.user.updatedAt ?? ""

  const storedCache = useMemo(
    () => readCachedUserAvatarDataUrl(resolvedUserId, cacheKey || undefined),
    [resolvedUserId, cacheKey],
  )

  const [src, setSrc] = useState<string | null>(storedCache)
  const [loading, setLoading] = useState(Boolean(resolvedUserId) && !storedCache)

  useEffect(() => {
    if (!resolvedUserId || !connection.sessionToken) {
      setSrc(null)
      setLoading(false)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    if (storedCache) {
      setSrc(storedCache)
      setLoading(false)
    } else {
      setLoading(true)
    }

    void (async () => {
      const blob = await fetchUserAvatarBlob(
        connection,
        resolvedUserId,
        cacheKey || undefined,
      )

      if (cancelled) return

      if (blob) {
        const dataUrl =
          (await cacheUserAvatarBlob(resolvedUserId, blob, cacheKey || undefined)) ?? null
        if (dataUrl) {
          setSrc(dataUrl)
          setLoading(false)
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
        setLoading(false)
        return
      }

      if (!storedCache) {
        setSrc(null)
        clearCachedUserAvatar(resolvedUserId)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [
    cacheKey,
    connection.apiBaseUrl,
    connection.sessionToken,
    resolvedUserId,
    storedCache,
  ])

  const dim = { width: size, height: size }
  const ring = isDark ? "ring-2 ring-white/15" : "ring-2 ring-[#e5e5e5]"

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name} profile` : "Profile"}
        className={`${radius} object-cover ${ring} ${className}`}
        style={dim}
        draggable={false}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center font-semibold ${radius} ${ring} ${
        isDark
          ? "bg-zinc-800"
          : `bg-[#f7f7f7] ${fallbackClassName}`
      }`}
      style={dim}
      aria-hidden={!name}
    >
      {loading ? (
        <span
          className={`size-[40%] animate-pulse ${radius} ${
            isDark ? "bg-zinc-600/60" : "bg-zinc-300/50"
          }`}
        />
      ) : (
        <span className={fallbackTextClassName}>{letter}</span>
      )}
    </div>
  )
}
