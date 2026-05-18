"use client"

import { useEffect, useState } from "react"
import { User } from "lucide-react"

import { resolveUserAvatarUrl } from "@/lib/utils/user-avatar-url"
import type { MobileConnection } from "@/lib/types/api"

type UserAvatarImageProps = {
  connection: MobileConnection
  avatarUrl: string | null | undefined
  updatedAt?: string
  name?: string
  size?: number
  className?: string
  fallbackClassName?: string
}

export function UserAvatarImage({
  connection,
  avatarUrl,
  updatedAt,
  name,
  size = 72,
  className = "",
  fallbackClassName = "",
}: UserAvatarImageProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    if (!avatarUrl?.trim()) {
      setSrc(null)
      return
    }

    const url = resolveUserAvatarUrl(connection.apiBaseUrl, avatarUrl, updatedAt)
    if (!url) {
      setSrc(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    void fetch(url, {
      headers: { Authorization: `Bearer ${connection.sessionToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("avatar")
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null)
          setFailed(true)
        }
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [avatarUrl, connection.apiBaseUrl, connection.sessionToken, updatedAt])

  const dim = { width: size, height: size }

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name} profile` : "Profile"}
        className={`rounded-full object-cover ${className}`}
        style={dim}
        draggable={false}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full ${fallbackClassName}`}
      style={dim}
      aria-hidden
    >
      <User className="text-white" style={{ width: size * 0.42, height: size * 0.42 }} />
    </div>
  )
}

