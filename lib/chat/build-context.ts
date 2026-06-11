import type { ChatInstanceContext } from "@/lib/api/chat"

function normalizeRestBase(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/+$/, "")
}

export function buildContextBlock(ctx: ChatInstanceContext, apiBaseUrl: string): string {
  const restBase = normalizeRestBase(apiBaseUrl)
  const folders = ctx.folders ?? []
  const appDatabases = ctx.appDatabases ?? []

  const libLines = ctx.libraries
    .map((l) => `- ${l.name}: id=${l.id} slug=${l.slug} assets=${l.count}`)
    .join("\n")

  const libs = ctx.libraries
    .map((l) => `${l.name} (${l.count} file${l.count !== 1 ? "s" : ""})`)
    .join(", ")

  const byType = ctx.byMediaType
    .sort((a, b) => b.count - a.count)
    .map((r) => `${r.type.charAt(0) + r.type.slice(1).toLowerCase()}: ${r.count}`)
    .join(", ")

  const total = ctx.byMediaType.reduce((s, r) => s + r.count, 0)
  const storageStr =
    ctx.storageGb < 1 ? `${Math.round(ctx.storageGb * 1024)} MB` : `${ctx.storageGb} GB`

  const lastUpload = ctx.lastUploadAt
    ? `Last upload: ${new Date(ctx.lastUploadAt).toLocaleString()}`
    : "No uploads yet"

  const folderBlock =
    folders.length === 0
      ? "Folders (snapshot): none"
      : [
          "Folders (snapshot — match library by slug; use folder id for DELETE/PATCH on /folders/{id}):",
          ...ctx.libraries.map((lib) => {
            const inLib = folders.filter((f) => f.libraryId === lib.id)
            if (inLib.length === 0) return `  [slug=${lib.slug}] (no folders)`
            const lines = inLib.map(
              (f) =>
                `    name="${f.name}" id=${f.id} pathCache=${f.pathCache} assets=${f.assetCount}`,
            )
            return `  [slug=${lib.slug} libraryId=${lib.id}]\n${lines.join("\n")}`
          }),
        ].join("\n")

  const appDbLines =
    appDatabases.length === 0
      ? "- (none — create one under App data databases in the mobile app)"
      : appDatabases
          .map((d) => {
            const desc = d.description
              ? ` description="${d.description.replace(/"/g, "'").slice(0, 140)}"`
              : ""
            return `- ${d.name} (slug=${d.slug}) id=${d.id} tables(active)=${d.tableCount} created=${d.createdAt.slice(0, 10)}${desc}`
          })
          .join("\n")

  const appDbBlock = [
    `App data databases (logical JSON stores in Postgres; NOT media libraries; LIST: GET ${restBase}/app-databases):`,
    appDbLines,
    "Listing these MUST NOT use [[ASSET_LIST:documents]] or Documents library filenames.",
  ].join("\n")

  const codeFiles = ctx.codeFiles ?? []
  const codeBlock =
    codeFiles.length === 0
      ? "Code files (source scripts — .py, .js, .ts, etc.; often in Inbox): none in snapshot"
      : [
          `Code files (${codeFiles.length} recent — use read_text_asset to read contents; list with [[ASSET_LIST:code]]):`,
          ...codeFiles.map(
            (f) =>
              `  - ${f.filename} id=${f.id} type=${f.mediaType} library=${f.librarySlug} size=${f.sizeBytes}B`,
          ),
        ].join("\n")

  const documentFiles = ctx.documentFiles ?? []
  const documentBlock =
    documentFiles.length === 0
      ? "Documents (PDFs, Office — not .py scripts): none in snapshot"
      : [
          `Documents (${documentFiles.length} recent — use read_pdf_asset for PDF bodies; list with [[ASSET_LIST:documents]]):`,
          ...documentFiles.map(
            (f) =>
              `  - ${f.filename} id=${f.id} type=${f.mediaType} library=${f.librarySlug} size=${f.sizeBytes}B`,
          ),
        ].join("\n")

  return [
    "--- Current Instance Data ---",
    `REST API base (use this exact prefix in examples): ${restBase}`,
    "Libraries — use each line's id as targetLibraryId (query) on POST /uploads and in /libraries/{id}/folders:",
    libLines || "- (none)",
    `Libraries (summary): ${libs || "none"}`,
    folderBlock,
    appDbBlock,
    codeBlock,
    documentBlock,
    `Total assets: ${total} (${byType || "none"})`,
    `Storage used: ${storageStr}`,
    lastUpload,
    ctx.passwordVaultLine ? ctx.passwordVaultLine : null,
    "---",
  ]
    .filter((line): line is string => line != null)
    .join("\n")
}

export function buildOutboundChatMessages(
  history: { role: string; content: string }[],
  systemInstruction: string,
  context: ChatInstanceContext | null,
  apiBaseUrl: string,
): { role: string; content: string }[] {
  const turns = history
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.content.trim() }))

  const instanceBlock = context ? `\n\n${buildContextBlock(context, apiBaseUrl)}` : ""
  const fullSys = `${systemInstruction.trim()}${instanceBlock}`

  return fullSys ? [{ role: "system", content: fullSys }, ...turns] : turns
}
