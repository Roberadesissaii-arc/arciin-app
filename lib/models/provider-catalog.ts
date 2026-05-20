/** Provider catalogue — mirrors desktop Models page (logos, copy, suggested models). */

export type ProviderMeta = {
  id: string
  name: string
  logo: string
  logoInvert?: boolean
  logoBg?: string
  description: string
  requiresKey: boolean
  requiresBaseUrl: boolean
  baseUrlPlaceholder?: string
  suggestedModels: string[]
  docsUrl: string
  badge?: string
}

export const MODEL_PROVIDERS: ProviderMeta[] = [
  {
    id: "openai",
    name: "OpenAI",
    logo: "/assets/icons/models/openai-light.svg",
    logoInvert: true,
    description: "GPT-4o, o1, and the full OpenAI model family via the official API.",
    requiresKey: true,
    requiresBaseUrl: false,
    suggestedModels: ["gpt-4o", "gpt-4o-mini", "o1", "gpt-4-turbo"],
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    logo: "/assets/icons/models/anthropic.svg",
    description: "Claude Opus, Sonnet, and Haiku via the Anthropic API.",
    requiresKey: true,
    requiresBaseUrl: false,
    suggestedModels: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    logo: "/assets/icons/models/gemini-color.svg",
    description: "Gemini Flash and Pro through Google AI Studio.",
    requiresKey: true,
    requiresBaseUrl: false,
    suggestedModels: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    logo: "/assets/icons/models/deepseek-color.svg",
    description: "DeepSeek V4 and chat models — OpenAI-compatible API.",
    requiresKey: true,
    requiresBaseUrl: false,
    baseUrlPlaceholder: "https://api.deepseek.com/v1",
    suggestedModels: ["deepseek-v4-flash", "deepseek-chat", "deepseek-reasoner"],
    docsUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    logo: "/assets/icons/models/grok.svg",
    logoInvert: true,
    description: "Grok-2 and Grok-3 from xAI.",
    requiresKey: true,
    requiresBaseUrl: false,
    suggestedModels: ["grok-2", "grok-2-mini", "grok-3"],
    docsUrl: "https://console.x.ai/",
  },
  {
    id: "meta",
    name: "Meta (Llama)",
    logo: "/assets/icons/models/meta-color.svg",
    description: "Llama via Together AI, Fireworks, or any compatible endpoint.",
    requiresKey: true,
    requiresBaseUrl: true,
    baseUrlPlaceholder: "https://api.together.xyz/v1",
    suggestedModels: ["meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"],
    docsUrl: "https://api.together.ai/",
  },
  {
    id: "qwen",
    name: "Qwen (Alibaba)",
    logo: "/assets/icons/models/qwen-color.svg",
    description: "Qwen-Turbo, Plus, and Max from Alibaba Cloud.",
    requiresKey: true,
    requiresBaseUrl: false,
    baseUrlPlaceholder: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    suggestedModels: ["qwen-max", "qwen-plus", "qwen-turbo"],
    docsUrl: "https://bailian.console.aliyun.com/",
  },
  {
    id: "ollama-local",
    name: "Ollama Local",
    logo: "/assets/icons/models/ollama-dark.svg",
    logoInvert: true,
    description: "Run open models on your Arciin server — detected from Ollama on that machine.",
    requiresKey: false,
    requiresBaseUrl: true,
    baseUrlPlaceholder: "http://localhost:11434",
    badge: "Local",
    suggestedModels: ["llama3.2", "mistral", "qwen2.5", "gemma3"],
    docsUrl: "https://ollama.com/",
  },
  {
    id: "ollama-cloud",
    name: "Ollama Cloud",
    logo: "/assets/models/ollama.svg",
    logoBg: "#ffffff",
    description: "Cloud-hosted models on ollama.com — no local GPU required.",
    requiresKey: true,
    requiresBaseUrl: false,
    badge: "Cloud",
    suggestedModels: [],
    docsUrl: "https://ollama.com/settings/api-keys",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    logo: "/assets/icons/models/elevenlabs.svg",
    description: "Text-to-speech and voice cloning for audio content.",
    requiresKey: true,
    requiresBaseUrl: false,
    badge: "Audio",
    suggestedModels: ["eleven_multilingual_v2", "eleven_turbo_v2_5"],
    docsUrl: "https://elevenlabs.io/app/settings/api-keys",
  },
]

export function providerMetaFor(id: string): ProviderMeta | undefined {
  const normalized = id === "ollama" ? "ollama-local" : id
  return MODEL_PROVIDERS.find((p) => p.id === normalized)
}
