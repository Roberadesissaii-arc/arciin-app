/** Remove leaked tool-call / function markup from streamed assistant text. */
export function stripAssistantStreamMarkup(text: string): string {
  let out = text
    .replace(/<\|tool[\s\S]*?calls[\s\S]*?end\|>/gi, " ")
    .replace(/<\|tool[^|]*\|>/gi, " ")
    .replace(/<function>[\s\S]*?<\/function>/gi, " ")
    .replace(/\bfunction\s*read_pdf_asset\s*\{[\s\S]*?\}/gi, " ")
    .replace(/\[goto-(?:page|chapter|printed):\d+\]/gi, " ")
    .replace(/\[highlight:[^\]]+\]/gi, " ")

  out = out
    .replace(/([}\])"'`])([A-Za-zÀ-ÿ0-9])/g, "$1 $2")
    .replace(/([.!?:;])([A-Za-zÀ-ÿ0-9])/g, "$1 $2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")

  return out
}

export function normalizeAssistantDisplayText(text: string): string {
  return stripAssistantStreamMarkup(text).trim()
}
