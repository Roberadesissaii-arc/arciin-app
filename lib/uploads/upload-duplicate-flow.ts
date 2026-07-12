import { checkDuplicates, deleteAsset, getAssets } from "@/lib/api/assets"
import type { MobileConnection } from "@/lib/types/api"
import type { LibrarySummary } from "@/lib/types/assets"
import {
  classifyFile,
  filterIdForMediaType,
} from "@/lib/files/classify-file"
import {
  libraryIdForFilter,
  type FilesFilterId,
} from "@/lib/files/library-helpers"
import { nextAvailableFilename, renameFile } from "@/lib/uploads/duplicate-filename"
import type {
  DuplicateUploadConflict,
  UploadTarget,
} from "@/lib/uploads/upload-duplicate-types"

export function resolveUploadTarget(
  filter: FilesFilterId,
  libraries: LibrarySummary[],
  file: File,
  folderId: string | null,
): UploadTarget {
  const inboxId =
    filter === "inbox" ? libraryIdForFilter(libraries, "inbox") : undefined
  if (inboxId) {
    return { libraryId: inboxId, folderId }
  }

  if (filter !== "all") {
    return {
      libraryId: libraryIdForFilter(libraries, filter),
      folderId,
    }
  }

  const filterId = filterIdForMediaType(classifyFile(file))
  return {
    libraryId: libraryIdForFilter(libraries, filterId),
    folderId,
  }
}

function targetKey(target: UploadTarget): string {
  return `${target.libraryId ?? "any"}:${target.folderId ?? "root"}`
}

async function listTakenFilenames(
  connection: MobileConnection,
  target: UploadTarget,
): Promise<Set<string>> {
  if (!target.libraryId) {
    const all = await getAssets(connection, {})
    return new Set(all.map((a) => a.originalFilename))
  }

  const raw = target.folderId
    ? await getAssets(connection, {
        libraryId: target.libraryId,
        folderId: target.folderId,
      })
    : (await getAssets(connection, { libraryId: target.libraryId })).filter(
        (a) => !a.folderId,
      )

  return new Set(raw.map((a) => a.originalFilename))
}

export async function findUploadDuplicates(
  connection: MobileConnection,
  files: File[],
  filter: FilesFilterId,
  libraries: LibrarySummary[],
  folderId: string | null,
): Promise<{ clean: File[]; conflicts: DuplicateUploadConflict[] }> {
  const dupeByName = await fetchRemoteDuplicateMap(connection, files, filter, libraries, folderId)
  return partitionUploadDuplicates(files, filter, libraries, folderId, dupeByName)
}

function assetDupeKey(target: UploadTarget, filename: string): string {
  return `${targetKey(target)}:${filename}`
}

function buildAssetDupeMap(
  assets: Array<{ id: string; originalFilename: string; libraryId?: string | null; folderId?: string | null }>,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const asset of assets) {
    const target: UploadTarget = {
      libraryId: asset.libraryId ?? undefined,
      folderId: asset.folderId ?? null,
    }
    map.set(assetDupeKey(target, asset.originalFilename), asset.id)
  }
  return map
}

/** Instant duplicate check using assets already loaded in the Files view (no network wait). */
export function findUploadDuplicatesFromAssets(
  files: File[],
  filter: FilesFilterId,
  libraries: LibrarySummary[],
  folderId: string | null,
  assets: Array<{ id: string; originalFilename: string; libraryId?: string | null; folderId?: string | null }>,
): { clean: File[]; conflicts: DuplicateUploadConflict[] } {
  return partitionUploadDuplicates(files, filter, libraries, folderId, buildAssetDupeMap(assets))
}

function partitionUploadDuplicates(
  files: File[],
  filter: FilesFilterId,
  libraries: LibrarySummary[],
  folderId: string | null,
  dupeByName: Map<string, string>,
): { clean: File[]; conflicts: DuplicateUploadConflict[] } {
  const clean: File[] = []
  const conflicts: DuplicateUploadConflict[] = []

  for (const file of files) {
    const target = resolveUploadTarget(filter, libraries, file, folderId)
    const assetId = dupeByName.get(assetDupeKey(target, file.name))
    if (assetId) {
      conflicts.push({
        file,
        existingAssetId: assetId,
        target,
        resolution: null,
      })
    } else {
      clean.push(file)
    }
  }

  return { clean, conflicts }
}

async function fetchRemoteDuplicateMap(
  connection: MobileConnection,
  files: File[],
  filter: FilesFilterId,
  libraries: LibrarySummary[],
  folderId: string | null,
): Promise<Map<string, string>> {
  const dupeByName = new Map<string, string>()
  const byTarget = new Map<string, { target: UploadTarget; files: File[] }>()

  for (const file of files) {
    const target = resolveUploadTarget(filter, libraries, file, folderId)
    const key = targetKey(target)
    const entry = byTarget.get(key) ?? { target, files: [] }
    entry.files.push(file)
    byTarget.set(key, entry)
  }

  for (const { target, files: groupFiles } of byTarget.values()) {
    const names = [...new Set(groupFiles.map((f) => f.name))]
    const { duplicates } = await checkDuplicates(connection, names, {
      libraryId: target.libraryId,
      folderId: target.folderId,
    })
    for (const hit of duplicates) {
      dupeByName.set(assetDupeKey(target, hit.filename), hit.assetId)
    }
  }

  return dupeByName
}

export async function applyDuplicateResolutions(
  connection: MobileConnection,
  resolved: DuplicateUploadConflict[],
): Promise<File[]> {
  const toUpload: File[] = []
  const takenByTarget = new Map<string, Set<string>>()

  for (const conflict of resolved) {
    if (conflict.resolution === "skip") continue

    const key = targetKey(conflict.target)
    let taken = takenByTarget.get(key)
    if (!taken) {
      taken = await listTakenFilenames(connection, conflict.target)
      takenByTarget.set(key, taken)
    }

    if (conflict.resolution === "replace") {
      try {
        await deleteAsset(connection, conflict.existingAssetId)
        taken.delete(conflict.file.name)
        toUpload.push(conflict.file)
        taken.add(conflict.file.name)
      } catch {
        continue
      }
      continue
    }

    const newName = nextAvailableFilename(conflict.file.name, taken)
    toUpload.push(renameFile(conflict.file, newName))
  }

  return toUpload
}
