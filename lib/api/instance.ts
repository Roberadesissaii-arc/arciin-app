import { fetchApi } from "@/lib/api/client"
import { defaultApiSignal } from "@/lib/api/fetch-timeout"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import type { ClaimInstanceInput, InstanceStatus } from "@/lib/types/instance"

function standaloneBase() {
  return getStandaloneApiBaseUrl()
}

export function getInstanceStatus(signal?: AbortSignal) {
  return fetchApi<InstanceStatus>("/instance/status", {
    apiBaseUrl: standaloneBase(),
    signal: signal ?? defaultApiSignal(),
  })
}

export function claimInstance(input: ClaimInstanceInput, signal?: AbortSignal) {
  return fetchApi<{ user: unknown; session: unknown }>("/instance/claim", {
    apiBaseUrl: standaloneBase(),
    method: "POST",
    body: {
      setupToken: input.setupToken,
      instanceName: input.instanceName,
      adminName: input.adminName,
      adminEmail: input.adminEmail,
      adminPassword: input.adminPassword,
      storageRoot: input.storageRoot,
      libraries: input.libraries,
      acceptedTermsAndPrivacy: input.acceptedTermsAndPrivacy,
      ...(input.recoveryQuestion?.trim() && input.recoveryAnswer?.trim()
        ? {
            recoveryQuestion: input.recoveryQuestion.trim(),
            recoveryAnswer: input.recoveryAnswer.trim(),
          }
        : {}),
    },
    signal,
  })
}
