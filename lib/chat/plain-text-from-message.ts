import { normalizeAssistantDisplayText } from "@/lib/chat/strip-stream-markup"

/** Plain text for copy / text-to-speech from assistant markdown. */
export function plainTextFromMessage(content: string): string {
  return normalizeAssistantDisplayText(content)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[(?:ASSETS|ASSET_LIST)[^\]]+\]\]/gi, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
