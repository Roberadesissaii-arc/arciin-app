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

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

/** Adjective–noun folder names — skips names already used in this library level. */
export function generateFolderName(existingNames: Iterable<string> = []): string {
  const taken = new Set(
    [...existingNames].map(normalizeName).filter(Boolean),
  )

  for (let attempt = 0; attempt < 200; attempt++) {
    const adj = ADJ[Math.floor(Math.random() * ADJ.length)]
    const noun = NOUN[Math.floor(Math.random() * NOUN.length)]
    const candidate = `${adj}-${noun}`
    if (!taken.has(normalizeName(candidate))) {
      return candidate
    }
  }

  return `folder-${Date.now()}`
}
