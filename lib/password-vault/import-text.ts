export type PasswordEntryDraft = {
  name: string
  username?: string
  password?: string
  url?: string
  notes?: string
  category?: string
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Build CSV text the server import parser accepts for a single manual entry. */
export function buildSingleEntryImportText(entry: PasswordEntryDraft) {
  const header = "name,username,password,url,notes,category"
  const row = [
    csvCell(entry.name.trim()),
    csvCell(entry.username?.trim() ?? ""),
    csvCell(entry.password ?? ""),
    csvCell(entry.url?.trim() ?? ""),
    csvCell(entry.notes?.trim() ?? ""),
    csvCell(entry.category?.trim() ?? ""),
  ].join(",")
  return `${header}\n${row}\n`
}
