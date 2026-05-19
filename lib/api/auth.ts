import { fetchApi } from "@/lib/api/client"
import type { MobileConnection, UserSummary } from "@/lib/types/api"
import type {
  AuthSession,
  ChangePasswordInput,
  SessionDetail,
  UpdateProfileInput,
} from "@/lib/types/models"

type AuthMeResponse = {
  user: UserSummary
  session: { id: string; expiresAt: string } | null
}

export function getAuthMe(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<AuthMeResponse>("/auth/me", {
    connection,
    method: "GET",
    signal,
  })
}

export function updateProfile(connection: MobileConnection, input: UpdateProfileInput) {
  return fetchApi<AuthSession>("/auth/profile", {
    connection,
    method: "POST",
    body: input,
  })
}

export function uploadProfileAvatar(connection: MobileConnection, file: File) {
  const formData = new FormData()
  formData.append("file", file)
  return fetchApi<AuthSession>("/auth/profile/avatar", {
    connection,
    method: "POST",
    body: formData,
  })
}

export function removeProfileAvatar(connection: MobileConnection) {
  return fetchApi<AuthSession>("/auth/profile/avatar/remove", {
    connection,
    method: "POST",
  })
}

export function changePassword(connection: MobileConnection, input: ChangePasswordInput) {
  return fetchApi<{ success: true }>("/auth/password", {
    connection,
    method: "POST",
    body: input,
  })
}

export function getSessions(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<SessionDetail[]>("/auth/sessions", {
    connection,
    method: "GET",
    signal,
  })
}

export function revokeSession(connection: MobileConnection, id: string) {
  return fetchApi<{ success: true }>(`/auth/sessions/${encodeURIComponent(id)}/revoke`, {
    connection,
    method: "POST",
  })
}
