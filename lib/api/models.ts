import { fetchApi } from "@/lib/api/client"
import type { MobileConnection } from "@/lib/types/api"
import type {
  CreateModelProfileInput,
  ModelProfile,
  OllamaAvailableModelsResult,
  OllamaCloudModelsResult,
  OllamaModelCapabilitiesResult,
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

export type ModelTestResult = { model: string; reply: string }

/** Free-tier Ollama connection test — one short prompt, one short reply. */
export function testModelProfile(
  connection: MobileConnection,
  id: string,
  input?: { prompt?: string; model?: string },
) {
  return fetchApi<ModelTestResult>(`/models/${id}/test`, {
    connection,
    method: "POST",
    body: input ?? {},
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

/** Batch Ollama /api/show — vision / thinking per model tag (cached server-side). */
export function getOllamaModelCapabilities(
  connection: MobileConnection,
  profileId: string,
  body: { models: string[] },
  signal?: AbortSignal,
) {
  return fetchApi<OllamaModelCapabilitiesResult>(`/models/${profileId}/model-capabilities`, {
    connection,
    method: "POST",
    body,
    signal,
  })
}
