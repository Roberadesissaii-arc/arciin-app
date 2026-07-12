import type { MobileConnection } from "@/lib/types/api"
import type { LibrarySummary } from "@/lib/types/assets"
import { fileExceedsUploadLimit, uploadTooLargeMessage } from "@/lib/api/upload-errors"
import type { FilesFilterId } from "@/lib/files/library-helpers"
import {
  findUploadDuplicates,
  findUploadDuplicatesFromAssets,
} from "@/lib/uploads/upload-duplicate-flow"
import type { DuplicateUploadConflict } from "@/lib/uploads/upload-duplicate-types"
import { MOBILE_UPLOAD_DUPLICATE_SKIP_THRESHOLD } from "@/lib/uploads/upload-concurrency"
import { snapshotFileListIndexed, waitForIosExport } from "@/lib/uploads/ios-file-picker"

export { snapshotFileListIndexed, waitForIosExport }

const VALIDATE_YIELD_EVERY = 24

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

/** @deprecated Use snapshotFileListIndexed after resolveFilesFromInput. */
export function snapshotFileList(fileList: FileList | null): File[] {
  return snapshotFileListIndexed(fileList)
}

export async function validateUploadSelection(
  files: File[],
  maxMb: number,
): Promise<{ ok: true } | { ok: false; issue: ReturnType<typeof uploadTooLargeMessage> }> {
  // Large iOS batches: reading every `.size` upfront can freeze WebKit — validate per upload instead.
  if (files.length > MOBILE_UPLOAD_DUPLICATE_SKIP_THRESHOLD) {
    return { ok: true }
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!
    if (index > 0 && index % VALIDATE_YIELD_EVERY === 0) {
      await yieldToMain()
    }
    if (fileExceedsUploadLimit(file.size, maxMb)) {
      return { ok: false, issue: uploadTooLargeMessage() }
    }
  }
  return { ok: true }
}

export function validateUploadFileSize(
  file: File,
  maxMb: number,
): ReturnType<typeof uploadTooLargeMessage> | null {
  if (fileExceedsUploadLimit(file.size, maxMb)) {
    return uploadTooLargeMessage()
  }
  return null
}

export async function resolveUploadDuplicates(
  connection: MobileConnection,
  files: File[],
  filter: FilesFilterId,
  libraries: LibrarySummary[],
  folderId: string | null,
  hasCache: boolean,
  assets: Array<{
    id: string
    originalFilename: string
    libraryId?: string | null
    folderId?: string | null
  }>,
): Promise<{ clean: File[]; conflicts: DuplicateUploadConflict[]; skippedDuplicateScan: boolean }> {
  if (files.length > MOBILE_UPLOAD_DUPLICATE_SKIP_THRESHOLD) {
    return { clean: files, conflicts: [], skippedDuplicateScan: true }
  }

  if (hasCache) {
    return {
      ...findUploadDuplicatesFromAssets(files, filter, libraries, folderId, assets),
      skippedDuplicateScan: false,
    }
  }

  return {
    ...(await findUploadDuplicates(connection, files, filter, libraries, folderId)),
    skippedDuplicateScan: false,
  }
}
