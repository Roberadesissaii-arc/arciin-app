import { fetchApi } from "@/lib/api/client"
import { getStandaloneApiBaseUrl } from "@/lib/standalone/api-origin"
import type { StorageDiscovery, StoragePrepareResult } from "@/lib/types/instance"

function standaloneBase() {
  return getStandaloneApiBaseUrl()
}

export function getStorageDiscovery(signal?: AbortSignal) {
  return fetchApi<StorageDiscovery>("/instance/storage-discovery", {
    apiBaseUrl: standaloneBase(),
    signal,
  })
}

export function prepareStoragePath(path: string) {
  return fetchApi<StoragePrepareResult>("/instance/storage-prepare", {
    apiBaseUrl: standaloneBase(),
    method: "POST",
    body: { path },
  })
}
