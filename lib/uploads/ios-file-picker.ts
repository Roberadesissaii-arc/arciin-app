function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/** Indexed copy — safer than Array.from for large iOS photo selections. */
export function snapshotFileListIndexed(fileList: FileList | null): File[] {
  if (!fileList?.length) return []
  const files: File[] = []
  for (let index = 0; index < fileList.length; index += 1) {
    const file = fileList.item(index)
    if (file) files.push(file)
  }
  return files
}

type ResolveFilesOptions = {
  /** Max time to wait for iOS to attach files once they start appearing (default 3 min). */
  maxWaitMs?: number
  /** Max time to wait for the FIRST file to appear before assuming cancel (default 25s). */
  appearTimeoutMs?: number
  /** How long the count must stay unchanged before we snapshot (default 700ms). */
  settleMs?: number
  onCount?: (count: number) => void
}

/**
 * iOS often fires `change` before all library exports are attached to the input,
 * and for large selections the count grows over several seconds. Wait until files
 * appear and the count stops growing, then snapshot. Returns [] if nothing ever
 * appears (picker cancelled).
 */
export async function resolveFilesFromInput(
  input: HTMLInputElement,
  options: ResolveFilesOptions = {},
): Promise<File[]> {
  const maxWaitMs = options.maxWaitMs ?? 180_000
  const appearTimeoutMs = options.appearTimeoutMs ?? 25_000
  const settleMs = options.settleMs ?? 700
  const started = Date.now()
  let lastCount = 0
  let lastChangeAt = Date.now()
  let everSaw = false

  while (Date.now() - started < maxWaitMs) {
    const count = input.files?.length ?? 0

    if (count !== lastCount) {
      lastCount = count
      lastChangeAt = Date.now()
      if (count > 0) {
        everSaw = true
        options.onCount?.(count)
      }
    }

    // Nothing showed up in time — treat as a cancelled picker.
    if (!everSaw && Date.now() - started >= appearTimeoutMs) {
      return []
    }

    if (count > 0 && Date.now() - lastChangeAt >= settleMs) {
      return snapshotFileListIndexed(input.files)
    }

    await sleep(150)
  }

  return snapshotFileListIndexed(input.files)
}

/** iOS Photos keeps exporting HEIC/MOV blobs after the picker closes. */
export async function waitForIosExport(count: number): Promise<void> {
  if (count <= 1) return
  // Even small multi-photo batches need a beat: iOS attaches the FileList entries
  // before the HEIC/MOV blobs behind them finish exporting, so reading too early
  // can hand us zero-byte files. A single-file pick is always fully materialized.
  const delayMs = count > 200 ? 900 : count > 80 ? 600 : count > 30 ? 350 : count > 12 ? 200 : 120
  await sleep(delayMs)
}
