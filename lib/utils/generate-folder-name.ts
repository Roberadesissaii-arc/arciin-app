const ADJ = [
  "new",
  "sorted",
  "shared",
  "quick",
  "daily",
  "archive",
  "project",
  "media",
  "backup",
  "import",
  "review",
  "draft",
] as const

const NOUN = [
  "folder",
  "collection",
  "bundle",
  "stash",
  "batch",
  "set",
  "pack",
  "group",
  "shelf",
  "box",
  "pile",
  "drop",
] as const

/** Adjective–noun folder names (same pattern as API keys on desktop). */
export function generateFolderName(): string {
  const adj = ADJ[Math.floor(Math.random() * ADJ.length)]
  const noun = NOUN[Math.floor(Math.random() * NOUN.length)]
  return `${adj}-${noun}`
}
