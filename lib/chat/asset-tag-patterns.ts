/** Shared [[ASSETS:…]] / [[ASSET_LIST:…]] patterns (whitespace-tolerant). */

export const ASSET_TAG_ANY_RE = /\[\[(?:ASSETS|ASSET_LIST):[^\]]+\]\]/gi
export const ASSET_IDS_TAG_RE = /\[\[ASSETS:\s*ids:\s*([^\]]+?)\s*\]\]/i
export const ASSET_LIST_TAG_RE = /\[\[ASSET_LIST:\s*([a-z]+)\s*\]\]/i
export const ASSET_GALLERY_TAG_RE = /\[\[ASSETS:\s*([a-z]+)(?:\s*:\s*(\d+))?\s*\]\]/i
export const READ_PDF_TAG_RE = /\[\[readPdfAssetContent:\s*([a-z0-9]+)\s*\]\]/i

export function extractAssetTags(text: string): string[] {
  return [...text.matchAll(ASSET_TAG_ANY_RE)].map((m) => m[0])
}

export function normalizeAssetTagsInContent(content: string): string {
  return content
    .replace(/\[\[ASSETS:\s*ids:\s*([^\]]+?)\s*\]\]/gi, (_, ids) => {
      const cleaned = ids
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join(",")
      return `[[ASSETS:ids:${cleaned}]]`
    })
    .replace(
      /\[\[ASSETS:\s*([a-z]+)(?:\s*:\s*(\d+))?\s*\]\]/gi,
      (_, type, count) =>
        count != null && count !== ""
          ? `[[ASSETS:${type.trim()}:${String(count).trim()}]]`
          : `[[ASSETS:${type.trim()}]]`,
    )
    .replace(
      /\[\[ASSET_LIST:\s*([a-z]+)\s*\]\]/gi,
      (_, type) => `[[ASSET_LIST:${type.trim()}]]`,
    )
}

/** Move preview/list tags from reasoning into the visible answer (models often put them in thinking). */
export function mergeAssetTagsFromThinking(answer: string, thinking?: string): string {
  const normalizedAnswer = normalizeAssetTagsInContent(answer)
  if (extractAssetTags(normalizedAnswer).length > 0) return normalizedAnswer

  const fromThinking = thinking ? extractAssetTags(thinking) : []
  if (fromThinking.length === 0) return normalizedAnswer

  const tags = [...new Set(fromThinking.map((t) => normalizeAssetTagsInContent(t)))]
  const trimmed = normalizedAnswer.trim()
  return trimmed ? `${trimmed}\n\n${tags.join("\n\n")}` : tags.join("\n\n")
}

export function stripAssetTagsFromText(text: string): string {
  return text
    .replace(/\n*\[\[(?:ASSETS|ASSET_LIST):[^\]]+\]\]\n*/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function stripAssetGalleryTags(content: string): string {
  return content.replace(/\[\[ASSETS:(?!ids:)[^\]]+\]\]/gi, "")
}

export function stripAssetListTags(content: string): string {
  return content.replace(/\[\[ASSET_LIST:[^\]]+\]\]/gi, "")
}
