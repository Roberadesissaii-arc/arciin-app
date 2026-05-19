import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type {
  CreateModelProfileInput,
  ModelProfile,
  OllamaAvailableModelsResult,
  OllamaCloudModelsResult,
  UpdateModelProfileInput,
} from "@/lib/types/models"

export function getModelProfiles(connection: MobileConnection, signal?: AbortSignal) {
  return fetchApi<ModelProfile[]>("/models", { connection, method: "GET", signal })
}

export function createModelProfile(connection: MobileConnection, input: CreateModelProfileInput) {
  return fetchApi<ModelProfile>("/models", { connection, method: "POST", body: input })
}

export function updateModelProfile(
  connection: MobileConnection,
  id: string,
  input: UpdateModelProfileInput,
) {
  return fetchApi<ModelProfile>(`/models/${id}`, { connection, method: "PATCH", body: input })
}

export function deleteModelProfile(connection: MobileConnection, id: string) {
  return fetchApi<{ success: true }>(`/models/${id}`, { connection, method: "DELETE" })
}

export function setDefaultModelProfile(connection: MobileConnection, id: string) {
  return fetchApi<ModelProfile>(`/models/${id}/set-default`, {
    connection,
    method: "POST",
  })
}

export function getAvailableModels(
  connection: MobileConnection,
  profileId: string,
  opts?: { refresh?: boolean; signal?: AbortSignal },
) {
  const qs = opts?.refresh ? "?refresh=1" : ""
  return fetchApi<OllamaAvailableModelsResult>(`/models/${profileId}/available-models${qs}`, {
    connection,
    method: "GET",
    signal: opts?.signal,
  })
}

export function getOllamaCloudModels(
  connection: MobileConnection,
  profileId: string,
  opts?: { refresh?: boolean; signal?: AbortSignal },
) {
  const qs = opts?.refresh ? "?refresh=1" : ""
  return fetchApi<OllamaCloudModelsResult>(`/models/${profileId}/cloud-models${qs}`, {
    connection,
    method: "GET",
    signal: opts?.signal,
  })
}
