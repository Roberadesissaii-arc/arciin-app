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
import { formatApiError } from "@/lib/api/errors"

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
        className="rounded-xl bg-[#f7f7f7] px-4 py-3 text-[14px] text-[#222222] outline-none placeholder-[#a0a0a0] transition-colors focus:bg-white"
        style={{ border: "1px solid #e5e5e5" }}
      />
    </div>
  )
}

export function EditProfilePage() {
  const { connection, ready, updateUser } = useConnection()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [initialName, setInitialName] = useState("")
  const [initialEmail, setInitialEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avatarKey, setAvatarKey] = useState(0)

  useEffect(() => {
    if (!ready || !connection) return
    let cancelled = false
    const ac = new AbortController()

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const me = await getAuthMe(connection, ac.signal)
        if (cancelled) return
        updateUser(me.user)
        setName(me.user.name)
        setEmail(me.user.email)
        setInitialName(me.user.name)
        setInitialEmail(me.user.email)
      } catch (err) {
        if (!cancelled) setError(formatApiError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [connection, ready, updateUser])

  const dirty =
    name.trim() !== initialName.trim() || email.trim().toLowerCase() !== initialEmail.trim().toLowerCase()

  async function handleSave() {
    if (!connection || !dirty) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const result = await updateProfile(connection, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      })
      updateUser(result.user)
      setInitialName(result.user.name)
      setInitialEmail(result.user.email)
      setName(result.user.name)
      setEmail(result.user.email)
      setMessage("Profile updated.")
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
      setAvatarKey((k) => k + 1)
      setMessage("Profile photo updated.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setAvatarBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleRemoveAvatar() {
    if (!connection || !connection.user.avatarUrl) return
    const ok = window.confirm("Remove your profile photo?")
    if (!ok) return
    setAvatarBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await removeProfileAvatar(connection)
      updateUser(result.user)
      setAvatarKey((k) => k + 1)
      setMessage("Profile photo removed.")
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setAvatarBusy(false)
    }
  }

  if (!ready || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#a0a0a0]" />
      </div>
    )
  }

  if (!connection) {
    return <p className="text-center text-[13px] text-[#717171]">Not connected.</p>
  }

  const user = connection.user

  return (
    <div className="flex flex-col gap-5">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleAvatarSelected(e.target.files?.[0])}
      />

      <div
        className="flex flex-col items-center gap-4 rounded-3xl bg-white p-6"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <div className="relative">
          <UserAvatarImage
            key={avatarKey}
            connection={connection}
            avatarUrl={user.avatarUrl}
            updatedAt={user.updatedAt}
            name={user.name}
            size={80}
            fallbackClassName="bg-gradient-to-br from-[#ff4f12] to-[#cc2e00]"
          />
          <button
            type="button"
            aria-label="Change photo"
            disabled={avatarBusy}
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-white shadow-sm transition-colors active:bg-[#f7f7f7] disabled:opacity-50"
            style={{ border: "1px solid #e5e5e5" }}
          >
            {avatarBusy ? (
              <Loader2 className="size-[14px] animate-spin text-[#717171]" />
            ) : (
              <Camera className="size-[14px] text-[#717171]" />
            )}
          </button>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-medium text-[#222222]">Profile photo</p>
          <p className="text-[11px] text-[#a0a0a0]">JPG, PNG or WebP · max 5 MB</p>
        </div>
        {user.avatarUrl ? (
          <button
            type="button"
            disabled={avatarBusy}
            onClick={() => void handleRemoveAvatar()}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-medium text-[#dc2626] transition-colors active:bg-red-50 disabled:opacity-50"
            style={{ border: "1px solid #fecaca" }}
          >
            <Trash2 className="size-3.5" />
            Remove photo
          </button>
        ) : null}
      </div>

      <div
        className="flex flex-col gap-4 rounded-3xl bg-white p-5"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
          Profile details
        </p>
        <Field
          label="Display name"
          id="edit-name"
          value={name}
          onChange={setName}
          placeholder="Your name"
        />
        <Field
          label="Email address"
          id="edit-email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />
      </div>

      {error ? (
        <p
          className="rounded-xl px-4 py-3 text-center text-[12px] text-[#b91c1c]"
          style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-xl px-4 py-3 text-center text-[12px] text-[#15803d]"
          style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
        >
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!dirty || saving}
        onClick={() => void handleSave()}
        className="flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-40 active:opacity-80"
        style={{ backgroundColor: "#ff4f12" }}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save changes
      </button>

      <p className="text-center text-[11px] text-[#c0c0c0]">
        Changes are saved to your Arciin instance only.
      </p>
    </div>
  )
}
