/** Post-process assistant replies so asset tags match what the user asked for. */

import {
  ASSET_GALLERY_TAG_RE,
  normalizeAssetTagsInContent,
  READ_PDF_TAG_RE,
  stripAssetGalleryTags,
} from "@/lib/chat/asset-tag-patterns"

export type ChatTurn = { role: string; content: string }

export type DocumentFileSnapshot = {
  id: string
  filename: string
}

export type FinalizeAssistantOptions = {
  documentFiles?: DocumentFileSnapshot[]
}

export function finalizeAssistantContent(
  content: string,
  userText: string,
  priorMessages: ChatTurn[] = [],
  options?: FinalizeAssistantOptions,
): string {
  let out = normalizeAssetTagsInContent(content)
  out = stripPlanningNarrationFromAnswer(out)
  out = stripWouldYouLikeToShow(out)
  out = ensureDocumentPreviewOnPossession(out, userText, priorMessages, options?.documentFiles)
  out = ensureSpecificAssetShow(out, userText, priorMessages, options?.documentFiles)
  out = stripUnrequestedAssetTags(out, userText, priorMessages)
  out = ensureFilenameListTag(out, userText, priorMessages)
  out = ensureAssetGalleryTag(out, userText, priorMessages)
  out = stripUnrequestedAssetTags(out, userText, priorMessages)
  out = stripAssetListsWhenQueryingAppDatabases(out, userText)
  return stripLeakedInlineToolTags(out)
}

const PLANNING_NARRATION_LINE_RE =
  /^(?:now,?\s+)?(?:let\s+me|i(?:'ll| will)|i\s+am\s+going\s+to)\s+(?:search|read|look|check|find|open|scan|browse)\b/i

const PLANNING_NARRATION_PHRASE_RE =
  /\b(?:now,?\s+let\s+me\s+search|i(?:'ll| will)\s+read\s+the\s+pdf|i(?:'ll| will)\s+search\s+inside|let\s+me\s+search\s+inside|here'?s?\s+the\s+pdf\s+you\s+asked\s+about\s*:?\s*$)/i

function stripPlanningNarrationFromAnswer(content: string): string {
  const lines = content.split(/\r?\n/)
  const kept = lines.filter((line) => {
    const trimmed = line.trim()
    if (!trimmed) return true
    if (PLANNING_NARRATION_LINE_RE.test(trimmed)) return false
    if (PLANNING_NARRATION_PHRASE_RE.test(trimmed)) return false
    return true
  })
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

function stripWouldYouLikeToShow(content: string): string {
  return content
    .replace(/\s*would\s+you\s+like\s+me\s+to\s+show\s+(?:it\s+)?to\s+you\??/gi, "")
    .replace(/\s*shall\s+i\s+show\s+(?:it\s+)?to\s+you\??/gi, "")
    .replace(/\s*want\s+me\s+to\s+show\s+(?:it\s+)?to\s+you\??/gi, "")
    .replace(/\?\s*$/m, ".")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function userAsksDocumentPossession(userText: string): boolean {
  const t = userText.trim().toLowerCase()
  if (!t) return false
  return (
    (/\b(do\s+i\s+have|have\s+i\s+got|is\s+there|do\s+you\s+see|any)\b/.test(t) &&
      /\b(book|pdf|document|ebook|manual|paper)\b/.test(t)) ||
    /\bdo\s+i\s+have\s+(?:a\s+)?\w+/.test(t)
  )
}

function assistantAffirmsSingleDocument(content: string): boolean {
  const t = content.trim()
  if (!t) return false
  if (/\b(yes|yeah|yep|you\s+have|there\s+is|i\s+found)\b/i.test(t)) {
    return (
      /\.pdf\b/i.test(t) ||
      /\b(book|ebook|document|manual)\b/i.test(t) ||
      /\bby\s+[A-Z]/i.test(t)
    )
  }
  return false
}

function resolveDocumentIdFromQuery(
  userText: string,
  documentFiles: DocumentFileSnapshot[],
): string | null {
  return findAssetIdByFilenameHint(userText, documentFiles)
}

/** "Do I have a book about X?" → yes + preview card, no extra confirmation step. */
function ensureDocumentPreviewOnPossession(
  content: string,
  userText: string,
  priorMessages: ChatTurn[],
  documentFiles?: DocumentFileSnapshot[],
): string {
  if (!documentFiles?.length) return content
  if (/\[\[ASSETS:\s*ids:/i.test(content)) return content

  const possessionQuery = userAsksDocumentPossession(userText)
  const affirms = assistantAffirmsSingleDocument(content)

  if (!possessionQuery && !affirms) return content

  const id =
    findAssetIdByFilenameHint(content, documentFiles) ??
    resolveDocumentIdFromQuery(userText, documentFiles) ??
    (documentFiles.length === 1 ? documentFiles[0]!.id : null)

  if (!id) return content

  const tag = `[[ASSETS:ids:${id}]]`
  const trimmed = stripWouldYouLikeToShow(content).trim()
  return trimmed ? `${trimmed}\n\n${tag}` : tag
}

function stripLeakedInlineToolTags(content: string): string {
  return content
    .replace(/\[\[readPdfAssetContent:\s*[^\]]+\]\]/gi, "")
    .replace(/\[\[read_text_asset:\s*[^\]]+\]\]/gi, "")
    .replace(/\[\[read[A-Za-z_]+:\s*[^\]]+\]\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function extractReadPdfAssetId(content: string): string | null {
  const m = content.match(READ_PDF_TAG_RE)
  return m?.[1]?.trim() ?? null
}

function significantFilenameWords(text: string): string[] {
  const stop = new Set([
    "only",
    "your",
    "documents",
    "document",
    "library",
    "fiction",
    "story",
    "size",
    "the",
    "that",
    "this",
    "book",
    "pdf",
    "file",
  ])
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w))
}

function findAssetIdByFilenameHint(
  hint: string,
  files: DocumentFileSnapshot[],
): string | null {
  const words = significantFilenameWords(hint)
  if (words.length === 0) return null

  let bestId: string | null = null
  let bestScore = 0
  for (const file of files) {
    const fn = file.filename.toLowerCase()
    let score = 0
    for (const word of words) {
      if (fn.includes(word)) {
        score++
        continue
      }
      if (word.length >= 4) {
        const stem = word.slice(0, 4)
        if (fn.includes(stem)) score++
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestId = file.id
    }
  }

  const threshold = words.length >= 2 ? 2 : 1
  return bestScore >= threshold ? bestId : null
}

function extractFilenameHintFromAssistant(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  for (const line of lines) {
    if (/\.pdf\b/i.test(line) || /\b(book|ebook)\b/i.test(line)) {
      return line.replace(/\s*\(size:\s*[^)]+\)\s*$/i, "").trim()
    }
  }

  const afterColon = text.match(/:\s*\n+\s*([^\n]+)/)?.[1]?.trim()
  return afterColon ?? null
}

function assistantNamedSingleDocument(priorMessages: ChatTurn[]): boolean {
  const lastAssistant = [...priorMessages].reverse().find((m) => m.role === "assistant")
  if (!lastAssistant?.content) return false
  const c = lastAssistant.content
  if (/\b(the\s+only|only\s+(?:fiction|story|pdf|book|document))\b/i.test(c)) return true
  if (assistantAffirmsSingleDocument(c)) return true
  if (/\[\[ASSETS:\s*ids:/i.test(c)) return true
  return /\b(yes,?\s+you\s+have|you\s+have)\b/i.test(c) && /\b(book|pdf|document|ebook)\b/i.test(c)
}

function userWantsSpecificReferentShow(
  userText: string,
  priorMessages: ChatTurn[] = [],
): boolean {
  const t = userText.trim().toLowerCase()
  if (!t) return false

  const wantsShow =
    /\b(show\s+me|let\s+me\s+see|can\s+you\s+show|open|display|view|preview)\b/.test(t) ||
    /^show\b/.test(t)

  const referent =
    /\b(that|this|the)\s+(book|pdf|document|file|story|ebook|one)\b/.test(t) ||
    /\bshow\s+(that|this|the)\s+(book|pdf|document|file|story)\b/.test(t) ||
    (/\b(that|this|it)\b/.test(t) && /\b(show|open|see|view)\b/.test(t))

  if (wantsShow && referent) return true

  if (/^show\s*(me)?\s*[!.?]*$/i.test(t)) {
    if (assistantNamedSingleDocument(priorMessages)) return true
    if (conversationMentionsMediaType(priorMessages, "documents")) return true
    const lastAssistant = [...priorMessages].reverse().find((m) => m.role === "assistant")
    if (lastAssistant && /\b(book|pdf|document|ebook)\b/i.test(lastAssistant.content)) return true
  }

  return false
}

function resolveReferentAssetId(
  content: string,
  priorMessages: ChatTurn[],
  documentFiles?: DocumentFileSnapshot[],
): string | null {
  const fromTag = extractReadPdfAssetId(content)
  if (fromTag) return fromTag

  if (!documentFiles?.length) return null

  const lastAssistant = [...priorMessages].reverse().find((m) => m.role === "assistant")
  if (!lastAssistant?.content) return null

  const hint = extractFilenameHintFromAssistant(lastAssistant.content)
  if (!hint) return null

  return findAssetIdByFilenameHint(hint, documentFiles)
}

/** Show one file the user pointed at ("that book") — not the whole Documents gallery. */
function ensureSpecificAssetShow(
  content: string,
  userText: string,
  priorMessages: ChatTurn[],
  documentFiles?: DocumentFileSnapshot[],
): string {
  const wantsSpecific = userWantsSpecificReferentShow(userText, priorMessages)
  const assetId = resolveReferentAssetId(content, priorMessages, documentFiles)

  if (!wantsSpecific && !assetId) return content

  let out = content

  if (wantsSpecific) {
    out = stripAssetGalleryTags(out).replace(/\n{3,}/g, "\n\n").trim()
  }

  const id = assetId ?? (wantsSpecific ? resolveReferentAssetId("", priorMessages, documentFiles) : null)
  if (!id) return out

  if (/\[\[ASSETS:\s*ids:/i.test(out)) return out

  const tag = `[[ASSETS:ids:${id}]]`
  return out ? `${out}\n\n${tag}` : tag
}

function userRequestsCodeFiles(userText: string): boolean {
  const t = userText.trim().toLowerCase()
  return /\b(python|py\s+files?|\.py\b|scripts?|source\s*code|code\s+files?)\b/.test(t)
}

function userMeansAppDataDatabases(userText: string): boolean {
  const t = userText.trim().toLowerCase()
  if (!t) return false

  const mentionsStores =
    /\bddb\b/.test(t) ||
    /\bapp\s*-?\s*data\b/.test(t) ||
    /\blogical\s+stores?\b/.test(t) ||
    /\bdatabases?\b/.test(t) ||
    /\b(my|the|all|every|each)\s+(?:registered\s+|logical\s+|app\s*-?\s*data\s+)?(?:databases?|\bdbs?\b)/i.test(t) ||
    /\b(which|what)\s+databases\b/i.test(userText)

  if (!mentionsStores) return false

  if (/\b(images?|videos?|music|documents?)\s+library\b/i.test(userText)) {
    return /\b(app\s*-?\s*data|ddb\b|\blogical\s+stores?|\bapp-databases\b|\bpostgres\s+(?:explorer|table)|\btable\s+browser\b)/i.test(
      userText,
    )
  }

  return true
}

function stripAssetListsWhenQueryingAppDatabases(content: string, userText: string): string {
  if (!userMeansAppDataDatabases(userText)) return content
  return content.replace(/\n*\[\[ASSET_LIST:[^\]]+\]\]\n*/gi, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

function conversationMentionsMediaType(
  priorMessages: ChatTurn[],
  kind: "images" | "videos" | "music" | "documents" | "code" | "files",
): boolean {
  const recent = priorMessages.slice(-8)
  const pattern =
    kind === "images"
      ? /\bimages?|pictures?|photos?\b/i
      : kind === "videos"
        ? /\bvideos?\b/i
        : kind === "music"
          ? /\bmusic|audio\b/i
          : kind === "documents"
            ? /\bdocuments?|pdfs?\b/i
            : kind === "code"
              ? /\b(python|py\s+files?|\.py\b|scripts?|source\s*code|code\s+files?)\b/i
              : /\bfiles?\b/i

  return recent.some((m) => pattern.test(m.content))
}

function userWantsAssetGallery(userText: string, priorMessages: ChatTurn[] = []): boolean {
  const t = userText.trim()
  if (!t) return false

  if (userWantsSpecificReferentShow(userText, priorMessages)) return false
  if (userRequestsCodeFiles(userText)) return false
  if (userWantsFilenameList(userText, priorMessages)) return false

  if (
    /^(?:hi|hello|hey|howdy|yo|sup|good\s+(?:morning|afternoon|evening)|thanks|thank\s+you|thx|ok(?:ay)?|cool|nice|bye|goodbye)[\s!.,?]*$/i.test(
      t,
    )
  ) {
    return false
  }

  const wantsSee =
    /\b(show\s+me|let\s+me\s+see|can\s+i\s+see|display|browse|view\s+my|see\s+my|open\s+my|pull\s+up|look\s+at\s+my|preview)\b/i.test(
      t,
    ) ||
    /\b(show|see|view|open)\s+(?:all\s+)?(?:my\s+)?(?:the\s+)?(?:recent\s+)?/i.test(t)
  const mentionsVisualMedia =
    /\b(images?|pictures?|photos?|videos?|music|documents?|pdfs?|library|libraries|media|assets?|uploads?)\b/i.test(
      t,
    )
  const mentionsGenericFiles = /\bfiles?\b/i.test(t) && !userRequestsCodeFiles(userText)

  if (wantsSee && (mentionsVisualMedia || mentionsGenericFiles)) return true

  if (
    /\b(show|see|display)\b/i.test(t) &&
    /\b(recent|latest|newest)\b/i.test(t) &&
    (mentionsVisualMedia || mentionsGenericFiles)
  ) {
    return true
  }

  const shortShowRequest =
    /^(?:show\s+me|show\s+them|show\s+those|show\s+it|let\s+me\s+see|display\s+them|see\s+them|preview\s+them)[\s!.,?]*$/i.test(
      t,
    ) || /^show[\s!.,?]*$/i.test(t)

  if (shortShowRequest && conversationMentionsMediaType(priorMessages, "code")) return false
  if (shortShowRequest && conversationMentionsMediaType(priorMessages, "images")) return true
  if (shortShowRequest && conversationMentionsMediaType(priorMessages, "videos")) return true
  if (shortShowRequest && conversationMentionsMediaType(priorMessages, "music")) return true
  if (shortShowRequest && conversationMentionsMediaType(priorMessages, "documents")) return true

  if (wantsSee && !mentionsVisualMedia && !mentionsGenericFiles) {
    if (conversationMentionsMediaType(priorMessages, "code")) return false
    if (conversationMentionsMediaType(priorMessages, "images")) return true
    if (conversationMentionsMediaType(priorMessages, "videos")) return true
    if (conversationMentionsMediaType(priorMessages, "music")) return true
    if (conversationMentionsMediaType(priorMessages, "documents")) return true
  }

  return false
}

function inferGalleryCountFromAnswer(content: string, media: string): number | null {
  const patterns =
    media === "images"
      ? [/\b(?:you have|there are|i found|found)\s+(\d+)\s+images?\b/i, /\b(\d+)\s+images?\b/i]
      : media === "videos"
        ? [/\b(?:you have|there are|found)\s+(\d+)\s+videos?\b/i, /\b(\d+)\s+videos?\b/i]
        : media === "music"
          ? [/\b(?:you have|there are|found)\s+(\d+)\s+(?:music|audio|tracks?)\b/i]
          : media === "documents"
            ? [
                /\b(?:you have|there are|found)\s+(\d+)\s+(?:documents?|pdfs?)\b/i,
                /\b(\d+)\s+(?:documents?|pdfs?)\b/i,
              ]
            : [/\b(?:you have|there are|found)\s+(\d+)\s+files?\b/i]

  for (const re of patterns) {
    const m = content.match(re)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > 0) return Math.min(n, 9)
    }
  }
  return null
}

function inferGalleryCountFromContext(priorMessages: ChatTurn[], media: string): number | null {
  const lastAssistant = [...priorMessages].reverse().find((m) => m.role === "assistant")
  if (!lastAssistant?.content) return null
  const c = lastAssistant.content
  const patterns =
    media === "images"
      ? [/\b(?:you have|there are|i found|found)\s+(\d+)\s+images?\b/i, /\b(\d+)\s+images?\b/i]
      : media === "videos"
        ? [/\b(?:you have|there are|found)\s+(\d+)\s+videos?\b/i, /\b(\d+)\s+videos?\b/i]
        : media === "music"
          ? [/\b(?:you have|there are|found)\s+(\d+)\s+(?:music|audio|tracks?)\b/i]
          : media === "documents"
            ? [/\b(?:you have|there are|found)\s+(\d+)\s+(?:documents?|pdfs?)\b/i, /\b(\d+)\s+(?:documents?|pdfs?)\b/i]
            : [/\b(?:you have|there are|found)\s+(\d+)\s+files?\b/i]

  for (const re of patterns) {
    const m = c.match(re)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > 0) return Math.min(n, 9)
    }
  }
  return null
}

function resolveGalleryMediaType(userText: string, priorMessages: ChatTurn[]): string {
  const t = userText.toLowerCase()
  if (userRequestsCodeFiles(userText)) return "code"
  if (/\bdocuments?|pdfs?\b/.test(t)) return "documents"
  if (/\bimages?|pictures?|photos?\b/.test(t)) return "images"
  if (/\bvideos?\b/.test(t)) return "videos"
  if (/\bmusic|audio\b/.test(t)) return "music"
  if (/\ball\s+files?\b/.test(t)) return "all"

  for (const m of [...priorMessages].reverse()) {
    const c = m.content.toLowerCase()
    if (/\bimages?|pictures?|photos?\b/.test(c)) return "images"
    if (/\bvideos?\b/.test(c)) return "videos"
    if (/\bmusic|audio|tracks?\b/.test(c)) return "music"
    if (/\bdocuments?|pdfs?\b/.test(c)) return "documents"
    const tag = m.content.match(ASSET_GALLERY_TAG_RE)?.[1]
    if (tag && tag !== "ids") return tag
  }

  return "images"
}

function ensureAssetGalleryTag(
  content: string,
  userText: string,
  priorMessages: ChatTurn[],
): string {
  if (!userWantsAssetGallery(userText, priorMessages)) return content
  if (/\[\[ASSETS:/i.test(content)) return content

  const media = resolveGalleryMediaType(userText, priorMessages)
  const singularVideo =
    media === "videos" && /\b(show|see|view|open)\s+(me\s+)?a\s+video\b/i.test(userText)
  const count =
    inferGalleryCountFromContext(priorMessages, media) ??
    inferGalleryCountFromAnswer(content, media) ??
    (singularVideo ? 1 : null)
  const tag = count != null ? `[[ASSETS:${media}:${count}]]` : `[[ASSETS:${media}]]`
  const trimmed = content.trim()
  return trimmed ? `${trimmed}\n\n${tag}` : tag
}

function assistantRecentlyShowedAssets(priorMessages: ChatTurn[]): boolean {
  const lastAssistant = [...priorMessages].reverse().find((m) => m.role === "assistant")
  if (!lastAssistant?.content) return false
  return /\[\[ASSETS:/i.test(lastAssistant.content)
}

function userWantsFilenameList(userText: string, priorMessages: ChatTurn[]): boolean {
  const t = userText.trim().toLowerCase()
  if (!t) return false

  if (userMeansAppDataDatabases(userText)) return false

  const wantsBrowseCode =
    userRequestsCodeFiles(userText) &&
    /\b(show\s+me|let\s+me\s+see|display|browse|view|list|what\s+are|which|all|every)\b/.test(t)
  if (wantsBrowseCode) return true

  const listIntent =
    /\b(list|enumerate|filenames?|file\s+names?|name\s+them)\b/.test(t) ||
    /^list\s+(?:them|those|these|it|my)\b/.test(t) ||
    /\blist\s+(?:them\s+)?(?:here|again|in\s+chat)\b/.test(t) ||
    /\bno,?\s*list\b/.test(t)

  if (!listIntent) {
    const shortShow =
      /^(?:show\s+me|show\s+them|show\s+those|let\s+me\s+see)[\s!.,?]*$/i.test(t) ||
      /^show[\s!.,?]*$/i.test(t)
    if (shortShow && conversationMentionsMediaType(priorMessages, "code")) return true
    return false
  }

  if (
    /\b(documents?|pdfs?|files?|images?|pictures?|photos?|videos?|music|python|scripts?|code|\.py|assets?|them|those|these)\b/.test(
      t,
    )
  ) {
    return true
  }

  if (/\b(list|name)\s+(?:them|those|it)\b/.test(t) && assistantRecentlyShowedAssets(priorMessages)) {
    return true
  }

  return false
}

function resolveAssetListMediaType(userText: string, priorMessages: ChatTurn[]): string {
  const t = userText.toLowerCase()
  if (/\b(python|py\s+files?|\.py|scripts?|source\s*code|code\s+files?)\b/.test(t)) return "code"
  if (/\b(documents?|pdfs?)\b/.test(t) && !/\b(python|\.py|scripts?)\b/.test(t)) return "documents"
  if (/\bimages?|pictures?|photos?\b/.test(t)) return "images"
  if (/\bvideos?\b/.test(t)) return "videos"
  if (/\bmusic|audio\b/.test(t)) return "music"
  if (/\ball\s+files?\b/.test(t)) return "all"

  const lastAssistant = [...priorMessages].reverse().find((m) => m.role === "assistant")
  const tag = lastAssistant?.content.match(/\[\[ASSET_LIST:\s*([a-z]+)\s*\]\]/i)?.[1]
  if (tag) return tag
  const assetTag = lastAssistant?.content.match(ASSET_GALLERY_TAG_RE)?.[1]
  if (assetTag) return assetTag

  if (conversationMentionsMediaType(priorMessages, "code")) return "code"
  if (conversationMentionsMediaType(priorMessages, "documents")) return "documents"

  return "documents"
}

function userWantsVisualDocumentList(userText: string): boolean {
  const t = userText.trim().toLowerCase()
  if (!t) return false
  if (userRequestsCodeFiles(userText)) return false
  const mentionsDocs =
    /\b(books?|ebooks?|pdfs?|documents?|papers?|manuals?)\b/.test(t) ||
    /\bmy\s+library\b/.test(t)
  const wantsList =
    /\b(list|show|all|every|enumerate|what)\b/.test(t) ||
    /\bwhich\s+(books?|pdfs?|documents?)\b/.test(t)
  return mentionsDocs && wantsList
}

function ensureFilenameListTag(content: string, userText: string, priorMessages: ChatTurn[]): string {
  if (userMeansAppDataDatabases(userText)) return content
  if (!userWantsFilenameList(userText, priorMessages)) return content
  if (/\[\[ASSET_LIST:/i.test(content) || /\[\[ASSETS:documents/i.test(content)) return content

  const media = resolveAssetListMediaType(userText, priorMessages)
  const trimmed = content.trim()

  if (media === "documents" && userWantsVisualDocumentList(userText)) {
    const tag = "[[ASSETS:documents:12]]"
    return trimmed ? `${trimmed}\n\n${tag}` : tag
  }

  return trimmed ? `${trimmed}\n\n[[ASSET_LIST:${media}]]` : `[[ASSET_LIST:${media}]]`
}

function responseUsesCodeFilenameList(content: string): boolean {
  return /\[\[ASSET_LIST:(?:code|python|py)\]\]/i.test(content)
}

function stripUnrequestedAssetTags(
  content: string,
  userText: string,
  priorMessages: ChatTurn[] = [],
): string {
  if (!/\[\[ASSETS:/i.test(content)) return content

  const stripGallery = () =>
    content
      .replace(/\n*\[\[ASSETS:[^\]]+\]\]\n*/gi, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()

  if (userRequestsCodeFiles(userText)) return stripGallery()
  if (responseUsesCodeFilenameList(content) && !userWantsAssetGallery(userText, priorMessages)) {
    return stripGallery()
  }
  if (
    /\[\[ASSET_LIST:/i.test(content) &&
    userWantsFilenameList(userText, priorMessages) &&
    !userWantsVisualDocumentList(userText)
  ) {
    return stripGallery()
  }
  if (!userWantsAssetGallery(userText, priorMessages)) return stripGallery()

  return content
}
