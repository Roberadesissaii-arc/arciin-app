/** DB / API may use `ollama`; mobile catalogue uses `ollama-local`. */
export function isOllamaProvider(provider: string): boolean {
  return provider === "ollama" || provider === "ollama-local" || provider === "ollama-cloud"
}

export function normalizeProviderId(provider: string): string {
  if (provider === "ollama") return "ollama-local"
  return provider
}
