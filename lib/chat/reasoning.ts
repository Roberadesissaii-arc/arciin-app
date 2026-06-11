import {
  extractAssetTags,
  mergeAssetTagsFromThinking,
  stripAssetTagsFromText,
} from "@/lib/chat/asset-tag-patterns"
import { normalizeAssistantDisplayText } from "@/lib/chat/strip-stream-markup"

/** Split Ollama/Qwen reasoning from user-visible answer (ported from desktop chat). */

const REASONING_OPEN_TAG =
  /<(?:think(?:ing)?|redacted_reasoning|redacted_think)>\s*/i
const REASONING_CLOSE_TAG =
  /<\/(?:think(?:ing)?|redacted_reasoning|redacted_think)>/i

export function parseThinking(raw: string): {
  thinking: string
  response: string
  inThink: boolean
} {
  const openMatch = raw.match(REASONING_OPEN_TAG)
  if (!openMatch || openMatch.index === undefined) {
    return { thinking: "", response: raw, inThink: false }
  }
  const afterOpen = raw.slice(openMatch.index + openMatch[0].length)
  const closeMatch = afterOpen.match(REASONING_CLOSE_TAG)
  if (!closeMatch || closeMatch.index === undefined) {
    return {
      thinking: afterOpen,
      response: raw.slice(0, openMatch.index),
      inThink: true,
    }
  }
  const thinking = afterOpen.slice(0, closeMatch.index).trim()
  const afterClose = afterOpen.slice(closeMatch.index + closeMatch[0].length)
  const response = (raw.slice(0, openMatch.index) + afterClose).trim()
  return { thinking, response, inThink: false }
}

function splitPlainTextReasoningBlock(accumulated: string): {
  thinking: string
  answer: string
  matched: boolean
} {
  const lead = accumulated.replace(/^\uFEFF/, "")
  const firstLine = (lead.split(/\r?\n/, 1)[0] ?? "").trimEnd()
  const startsReasoning =
    /^Thinking\b/i.test(firstLine) ||
    /^Thinking\s+process\s*:/im.test(lead.trimStart())
  if (!startsReasoning) {
    return { thinking: "", answer: accumulated, matched: false }
  }

  const endPatterns: RegExp[] = [
    /\n\s*\.{3}\s*done\s+thinking\.?\s*(?:\r?\n)+/i,
    /\n\s*\.{2}\s*done\s+thinking\.?\s*(?:\r?\n)+/i,
    /\n\s*done\s+thinking\.?\s*(?:\r?\n)+/i,
  ]
  for (const re of endPatterns) {
    const m = re.exec(lead)
    if (m?.index !== undefined) {
      return {
        thinking: lead.slice(0, m.index + m[0].length).trimEnd(),
        answer: lead.slice(m.index + m[0].length).trimStart(),
        matched: true,
      }
    }
  }
  return { thinking: lead, answer: "", matched: true }
}

function withNormalizedAnswer(result: {
  thinking: string
  answer: string
  inReasoningBlock: boolean
}) {
  return {
    ...result,
    answer: normalizeAssistantDisplayText(result.answer),
  }
}

export function deriveStreamingThinkingAndAnswer(
  accumulated: string,
  dedicatedThinking: string,
  showReasoningPanel = true,
): { thinking: string; answer: string; inReasoningBlock: boolean } {
  if (dedicatedThinking) {
    const tagged = parseThinking(accumulated)
    return withNormalizedAnswer({
      thinking: showReasoningPanel ? dedicatedThinking : "",
      answer: tagged.response || (tagged.inThink ? "" : accumulated),
      inReasoningBlock: false,
    })
  }

  const plain = splitPlainTextReasoningBlock(accumulated)
  if (plain.matched) {
    if (showReasoningPanel) {
      return withNormalizedAnswer({
        thinking: plain.thinking,
        answer: plain.answer,
        inReasoningBlock: !plain.answer.trim(),
      })
    }
    return withNormalizedAnswer({
      thinking: "",
      answer: plain.answer,
      inReasoningBlock: false,
    })
  }

  const tagged = parseThinking(accumulated)
  if (tagged.thinking || tagged.inThink) {
    if (showReasoningPanel) {
      return withNormalizedAnswer({
        thinking: tagged.thinking,
        answer: tagged.response,
        inReasoningBlock: tagged.inThink,
      })
    }
    return withNormalizedAnswer({
      thinking: "",
      answer: tagged.response,
      inReasoningBlock: false,
    })
  }

  return withNormalizedAnswer({
    thinking: "",
    answer: accumulated,
    inReasoningBlock: false,
  })
}

export function displayThinkingDuringStream(
  reasoningUiEnabled: boolean,
  derived: { thinking: string; inReasoningBlock: boolean },
): string | undefined {
  if (!reasoningUiEnabled) return undefined
  if (derived.thinking.length > 0 || derived.inReasoningBlock) return derived.thinking
  return ""
}

export function resolveFinalAssistantMessage(
  accumulated: string,
  thinkingAccum: string,
  showReasoningPanel = true,
  reasoningUiEnabled = true,
): { content: string; thinking: string | undefined } {
  const derived = deriveStreamingThinkingAndAnswer(accumulated, thinkingAccum, showReasoningPanel)
  let content = derived.answer.trim()
  let thinking =
    reasoningUiEnabled && (derived.thinking.length > 0 || derived.inReasoningBlock)
      ? derived.thinking.trim()
      : undefined

  if (!content && thinking) {
    const retag = parseThinking(accumulated)
    if (retag.response.trim()) {
      content = retag.response.trim()
    } else if (!retag.inThink && !retag.thinking) {
      content = accumulated.trim()
    }
  }

  if (!content) {
    content = accumulated.replace(REASONING_OPEN_TAG, "").replace(REASONING_CLOSE_TAG, "").trim()
  }

  if (!content.trim() && thinking?.trim()) {
    const planOnly =
      /^(?:let\s+me|i(?:'ll| will)|still)\b/i.test(thinking.trim()) && thinking.trim().length < 320
    if (!planOnly) {
      content = thinking.trim()
    }
  }

  content = mergeAssetTagsFromThinking(content, thinking)

  if (!content.trim()) {
    const tags = [
      ...extractAssetTags(accumulated),
      ...(thinking ? extractAssetTags(thinking) : []),
    ]
    if (tags.length > 0) {
      content = [...new Set(tags)].join("\n\n")
    }
  }

  content = normalizeAssistantDisplayText(content)
  if (thinking) {
    thinking = stripAssetTagsFromText(normalizeAssistantDisplayText(thinking))
  }

  if (content && thinking && content === thinking) {
    thinking = undefined
  }

  thinking = thinking?.replace(REASONING_OPEN_TAG, "").replace(REASONING_CLOSE_TAG, "").trim()
  if (!thinking) thinking = undefined

  return { content, thinking }
}

export function hasVisibleAssistantAnswer(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  const proseOnly = trimmed
    .replace(/\[\[ASSETS:[^\]]+\]\]/gi, "")
    .replace(/\[\[ASSET_LIST:[^\]]+\]\]/gi, "")
    .trim()
  if (proseOnly.length > 0) return true
  return (
    /\[\[ASSETS:/i.test(trimmed) ||
    /\[\[ASSET_LIST:/i.test(trimmed) ||
    /\[\[ASSETS:\s*ids:/i.test(trimmed)
  )
}
