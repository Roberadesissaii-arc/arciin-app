import { formatCellValue } from "@/lib/database/format-cell"

export function TableCell({ value }: { value: unknown }) {
  const formatted = formatCellValue(value)

  if (formatted.pill) {
    return (
      <span
        className="inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold"
        style={{
          backgroundColor: `${formatted.pill}22`,
          color: formatted.pill,
        }}
      >
        {formatted.text}
      </span>
    )
  }

  return (
    <span className="whitespace-nowrap font-mono text-[11px] text-[#333333]" title={String(value ?? "")}>
      {formatted.text}
    </span>
  )
}

export function formatColumnLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}
