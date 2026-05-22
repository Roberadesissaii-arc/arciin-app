"use client"

import { useEffect, useRef, useState } from "react"

import { Camera, Loader2, Save, Trash2 } from "lucide-react"

import { UserAvatarImage } from "@/components/profile/user-avatar-image"
import { useConnection } from "@/components/providers/connection-provider"
import {
  getAuthMe,
  removeProfileAvatar,
  updateProfile,
  uploadProfileAvatar,
} from "@/lib/api/auth"
import { clearCachedUserAvatar } from "@/lib/utils/user-avatar-cache"
import { formatApiError } from "@/lib/api/errors"
import {
  isServerConnected,
  suppressFetchErrorWhenOffline,
} from "@/lib/connection/offline-ui"
import { joinDisplayName, splitDisplayName } from "@/lib/utils/display-name"

function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string
  id: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold text-[#717171]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none placeholder-[#a0a0a0] focus:bg-white"
        style={{ border: "1px solid #e5e5e5" }}
      />
    </div>
  )
}

export function ProfileInlinePanel({ enabled }: { enabled: boolean }) {
  const { connection, ready, updateUser, serverReachable } = useConnection()
  const fileRef = useRef<HTMLInputElement>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [initialFirst, setInitialFirst] = useState("")
  const [initialLast, setInitialLast] = useState("")
  const [initialEmail, setInitialEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avatarRevision, setAvatarRevision] = useState(0)

  const user = connection?.user
  const sessionKey = connection?.sessionToken ?? null
  const connectionRef = useRef(connection)
  connectionRef.current = connection
  const refreshedSessionRef = useRef<string | null>(null)

  const serverConnected = isServerConnected(serverReachable)
  const visibleError = suppressFetchErrorWhenOffline(serverReachable, error)

  useEffect(() => {
    if (serverReachable === false) setError(null)
  }, [serverReachable])

  useEffect(() => {
    if (!user || !enabled || !serverConnected) return
    const { first, last } = splitDisplayName(user.name)
    setFirstName(first)
    setLastName(last)
    setEmail(user.email)
    setInitialFirst(first)
    setInitialLast(last)
    setInitialEmail(user.email)
  }, [user, enabled, serverConnected])

  useEffect(() => {
    if (!enabled || !ready || !sessionKey || !serverConnected) return
    if (refreshedSessionRef.current === sessionKey) return

    const conn = connectionRef.current
    if (!conn) return

    let cancelled = false
    void (async () => {
      try {
        const me = await getAuthMe(conn)
        if (cancelled) return
        updateUser(me.user)
        refreshedSessionRef.current = sessionKey
      } catch (err) {
        if (!cancelled) setError(formatApiError(err))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, ready, sessionKey, updateUser, serverConnected])

  useEffect(() => {
    if (sessionKey && refreshedSessionRef.current && refreshedSessionRef.current !== sessionKey) {
      refreshedSessionRef.current = null
    }
  }, [sessionKey])

  if (!enabled || !connection) return null

  if (!serverConnected) {
    return (
      <p className="text-[12px] leading-relaxed text-[#717171]">
        Your server is disconnected. Reconnect using the banner above, then edit your
        name and photo here.
      </p>
    )
  }

  const displayName = joinDisplayName(firstName, lastName)
  const initialDisplayName = joinDisplayName(initialFirst, initialLast)
  const dirty =
    displayName !== initialDisplayName ||
    email.trim().toLowerCase() !== initialEmail.trim().toLowerCase()

  async function handleSave() {
    if (!connection || !dirty) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const result = await updateProfile(connection, {
        name: displayName,
        email: email.trim().toLowerCase(),
      })
      updateUser(result.user)
      const { first, last } = splitDisplayName(result.user.name)
      setFirstName(first)
      setLastName(last)
      setEmail(result.user.email)
      setInitialFirst(first)
      setInitialLast(last)
      setInitialEmail(result.user.email)
      setMessage("Profile saved.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarSelected(file: File | undefined) {
    if (!connection || !file) return
    setAvatarBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await uploadProfileAvatar(connection, file)
      updateUser(result.user)
      clearCachedUserAvatar(result.user.id)
      setAvatarRevision((n) => n + 1)
      setMessage("Profile photo updated.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setAvatarBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleRemoveAvatar() {
    if (!connection?.user.avatarUrl) return
    const ok = window.confirm("Remove your profile photo?")
    if (!ok) return
    setAvatarBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await removeProfileAvatar(connection)
      updateUser(result.user)
      clearCachedUserAvatar(result.user.id)
      setAvatarRevision((n) => n + 1)
      setMessage("Profile photo removed.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setAvatarBusy(false)
    }
  }

  const avatarCacheKey = `${user?.updatedAt ?? ""}-${avatarRevision}`

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleAvatarSelected(e.target.files?.[0])}
      />

      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <UserAvatarImage
            key={avatarCacheKey}
            connection={connection}
            userId={user?.id}
            avatarUrl={user?.avatarUrl}
            updatedAt={avatarCacheKey}
            name={user?.name}
            size={64}
            tone="light"
            shape="rounded"
            fallbackTextClassName="text-[#717171]"
          />
          <button
            type="button"
            aria-label="Change photo"
            disabled={avatarBusy}
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-white shadow-sm active:bg-[#f7f7f7] disabled:opacity-50"
            style={{ border: "1px solid #e5e5e5" }}
          >
            {avatarBusy ? (
              <Loader2 className="size-3.5 animate-spin text-[#717171]" />
            ) : (
              <Camera className="size-3.5 text-[#717171]" />
            )}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[#222222]">Profile photo</p>
          <p className="text-[11px] text-[#a0a0a0]">JPG, PNG or WebP</p>
          {user?.avatarUrl ? (
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => void handleRemoveAvatar()}
              className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#dc2626] active:opacity-70 disabled:opacity-50"
            >
              <Trash2 className="size-3" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <Field
        label="First name"
        id="profile-first"
        value={firstName}
        onChange={setFirstName}
        placeholder="First name"
      />
      <Field
        label="Last name"
        id="profile-last"
        value={lastName}
        onChange={setLastName}
        placeholder="Last name"
      />
      <Field
        label="Email"
        id="profile-email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
      />

      {visibleError ? (
        <p className="rounded-xl px-3 py-2 text-[12px] text-[#b91c1c] bg-[#fef2f2] border border-[#fecaca]">
          {visibleError}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl px-3 py-2 text-[12px] text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0]">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!dirty || saving}
        onClick={() => void handleSave()}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ff4f12] text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save profile
      </button>
    </div>
  )
}
