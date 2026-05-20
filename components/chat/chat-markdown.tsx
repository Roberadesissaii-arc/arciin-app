"use client"

import Link from "next/link"

import {
  ChatInlineAssetBlock,
  ChatInlineAssetBlockByIds,
} from "@/components/chat/chat-inline-assets"

function parseInline(text: string): React.ReactNode {
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g
  const nodes: React.ReactNode[] = []
  let last = 0
  let k = 0
  let m: RegExpExecArray | null

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={k++} className="font-semibold text-[#222222]">
          {m[1]}
        </strong>,
      )
    } else if (m[2] !== undefined) {
      nodes.push(<em key={k++}>{m[2]}</em>)
    } else if (m[3] !== undefined) {
      nodes.push(
        <code
          key={k++}
          className="rounded bg-[#f0f0f0] px-1 py-px font-mono text-[11px] text-[#444444]"
        >
          {m[3]}
        </code>,
      )
    } else if (m[4] !== undefined && m[5] !== undefined) {
      const href = m[5]
      const isInternal = href.startsWith("/")
      if (isInternal) {
        nodes.push(
          <Link
            key={k++}
            href={href}
            className="font-medium text-[#ff4f12] underline-offset-2 hover:underline"
          >
            {m[4]}
          </Link>,
        )
      } else {
        nodes.push(
          <a
            key={k++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#ff4f12] underline-offset-2 hover:underline"
          >
            {m[4]}
          </a>,
        )
      }
    }
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes.length === 1 ? nodes[0] : nodes
}

function renderAssetLine(line: string, key: number): React.ReactNode {
  const idsMatch = line.match(/\[\[ASSETS:ids:([^\]]+)\]\]/)
  if (idsMatch) {
    const ids = idsMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
    return <ChatInlineAssetBlockByIds key={key} assetIds={ids} />
  }

  const listMatch = line.match(/\[\[ASSET_LIST:([a-z]+)\]\]/)
  if (listMatch) {
    const type = listMatch[1]
    return <ChatInlineAssetBlock key={key} mediaType={type} limit={12} />
  }

  const assetMatch = line.match(/\[\[ASSETS:([a-z]+)(?::(\d+))?\]\]/)
  if (assetMatch) {
    const type = assetMatch[1]
    const limit = assetMatch[2] ? parseInt(assetMatch[2], 10) : 9
    return <ChatInlineAssetBlock key={key} mediaType={type} limit={limit} />
  }

  return null
}

export function ChatMarkdown({ content }: { content: string }) {
  const lines = content.split("\n")
  const nodes: React.ReactNode[] = []
  const listItems: { text: string; ordered: boolean }[] = []
  const tableLines: string[] = []
  let inCode = false
  const codeLines: string[] = []
  let k = 0

  function flushList() {
    if (!listItems.length) return
    const ordered = listItems[0].ordered
    const items = listItems.splice(0)
    nodes.push(
      ordered ? (
        <ol key={k++} className="my-1.5 list-decimal space-y-1 pl-5 text-[13px]">
          {items.map((it, i) => (
            <li key={i} className="leading-relaxed text-[#333333]">
              {parseInline(it.text)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={k++} className="my-1.5 space-y-1 pl-1 text-[13px]">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 leading-relaxed text-[#333333]">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#c0c0c0]" />
              <span>{parseInline(it.text)}</span>
            </li>
          ))}
        </ul>
      ),
    )
  }

  function flushTable() {
    if (!tableLines.length) return
    const rows = tableLines.splice(0)
    const parseRow = (line: string) => line.split("|").slice(1, -1).map((c) => c.trim())
    const isSep = (line: string) =>
      line.replace(/\s/g, "").replace(/[|:\-]/g, "").length === 0 && line.includes("-")
    const sepIdx = rows.findIndex(isSep)
    const headerCells = rows[0] ? parseRow(rows[0]) : []
    const bodyRows = rows
      .filter((_, i) => i !== 0 && (sepIdx === -1 || i !== sepIdx))
      .map(parseRow)
      .filter((r) => r.length > 0)

    nodes.push(
      <div key={k++} className="my-2 overflow-x-auto rounded-xl" style={{ border: "1px solid #e5e5e5" }}>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#f7f7f7]">
              {headerCells.map((cell, ci) => (
                <th
                  key={ci}
                  className="border-b border-[#ececec] px-3 py-2 text-left font-semibold text-[#222222]"
                >
                  {parseInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 1 ? "bg-[#fafafa]" : ""}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border-b border-[#ececec] px-3 py-2 text-[#333333] last:border-0"
                  >
                    {parseInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    )
  }

  function flushAll() {
    flushList()
    flushTable()
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!inCode) {
        flushAll()
        inCode = true
        codeLines.length = 0
      } else {
        nodes.push(
          <pre
            key={k++}
            className="my-2 overflow-x-auto rounded-xl bg-[#1a1a1a] px-3 py-2.5 text-[11px] leading-relaxed text-[#f0f0f0]"
          >
            <code>{codeLines.join("\n")}</code>
          </pre>,
        )
        inCode = false
      }
      continue
    }

    if (inCode) {
      codeLines.push(line)
      continue
    }

    const assetNode = renderAssetLine(line.trim(), k)
    if (assetNode) {
      flushAll()
      const before = line.replace(/\[\[(?:ASSETS|ASSET_LIST)[^\]]+\]\]/g, "").trim()
      if (before) {
        nodes.push(
          <p key={k++} className="text-[13px] leading-relaxed text-[#333333]">
            {parseInline(before)}
          </p>,
        )
      }
      nodes.push(assetNode)
      k++
      continue
    }

    if (line.trimStart().startsWith("|")) {
      flushList()
      tableLines.push(line)
      continue
    }
    flushTable()

    const h2 = line.match(/^#{1,2}\s+(.+)/)
    const h3 = !h2 && line.match(/^###\s+(.+)/)
    const hr = /^---+$/.test(line.trim())
    const ul = line.match(/^[-*]\s+(.+)/)
    const ol = line.match(/^\d+\.\s+(.+)/)

    if (h2) {
      flushList()
      nodes.push(
        <p key={k++} className="mb-0.5 mt-3 text-[14px] font-bold text-[#222222] first:mt-0">
          {parseInline(h2[1])}
        </p>,
      )
    } else if (h3) {
      flushList()
      nodes.push(
        <p key={k++} className="mb-0.5 mt-2 text-[13px] font-semibold text-[#222222]">
          {parseInline(h3[1])}
        </p>,
      )
    } else if (hr) {
      flushList()
      nodes.push(<hr key={k++} className="my-2 border-[#ececec]" />)
    } else if (ul) {
      if (listItems[0]?.ordered) flushList()
      listItems.push({ text: ul[1], ordered: false })
    } else if (ol) {
      if (listItems[0] && !listItems[0].ordered) flushList()
      listItems.push({ text: ol[1], ordered: true })
    } else if (line.trim() === "") {
      flushList()
    } else {
      flushList()
      nodes.push(
        <p key={k++} className="text-[13px] leading-relaxed text-[#333333]">
          {parseInline(line)}
        </p>,
      )
    }
  }

  if (inCode && codeLines.length) {
    nodes.push(
      <pre
        key={k++}
        className="my-2 overflow-x-auto rounded-xl bg-[#1a1a1a] px-3 py-2.5 text-[11px] leading-relaxed text-[#f0f0f0]"
      >
        <code>{codeLines.join("\n")}</code>
      </pre>,
    )
  }
  flushAll()

  return <div className="space-y-0.5">{nodes}</div>
}
