import { fetchApi } from "@/lib/api/client"
import { defaultApiSignal } from "@/lib/api/fetch-timeout"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"

function standaloneBase() {
  return getStandaloneApiBaseUrl()
}

export type RecoveryLookupResult = {
  available: boolean
  question?: string
}

export function lookupPasswordRecovery(email: string, signal?: AbortSignal) {
  return fetchApi<RecoveryLookupResult>("/auth/recovery/lookup", {
    apiBaseUrl: standaloneBase(),
    method: "POST",
    body: { email: email.trim().toLowerCase() },
    signal: signal ?? defaultApiSignal(),
  })
}

export function resetPasswordWithRecovery(input: {
  email: string
  answer: string
  newPassword: string
}) {
  return fetchApi<{ success: true }>("/auth/recovery/reset", {
    apiBaseUrl: standaloneBase(),
    method: "POST",
    body: {
      email: input.email.trim().toLowerCase(),
      answer: input.answer,
      newPassword: input.newPassword,
    },
  })
}
