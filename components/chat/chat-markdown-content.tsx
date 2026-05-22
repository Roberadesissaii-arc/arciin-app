"use client"

import Link from "next/link"
import type React from "react"

import {
  ChatInlineAssetBlock,
  ChatInlineAssetBlockByIds,
} from "@/components/chat/chat-inline-assets"

const FENCE_RE =
  /(?:^|\n)\s*```([a-zA-Z0-9+#.-]*)(?:[ \t]+([^\n`]+)|\s*\r?\n([\s\S]*?))```[ \t]*(?:\r?\n|$)/g

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
          className="rounded bg-[#f0f0f0] px-[5px] py-px font-mono text-[11px] text-[#444444]"
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

function renderAssetLine(line: string, key: number): React.ReactNode | null {
  const idsMatch = line.match(/\[\[ASSETS:ids:([^\]]+)\]\]/)
  if (idsMatch) {
    const ids = idsMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
    return <ChatInlineAssetBlockByIds key={key} assetIds={ids} />
  }

  const listMatch = line.match(/\[\[ASSET_LIST:([a-z]+)\]\]/)
  if (listMatch) {
    return <ChatInlineAssetBlock key={key} mediaType={listMatch[1]} limit={12} />
  }

  const assetMatch = line.match(/\[\[ASSETS:([a-z]+)(?::(\d+))?\]\]/)
  if (assetMatch) {
    const limit = assetMatch[2] ? parseInt(assetMatch[2], 10) : 9
    return <ChatInlineAssetBlock key={key} mediaType={assetMatch[1]} limit={limit} />
  }

  return null
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const trimmed = code.replace(/\n+$/, "")
  if (!trimmed) return null
  return (
    <div className="my-2.5 w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#fafafa]">
      {lang ? (
        <div className="border-b border-[#ececec] px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[#717171]">
          {lang}
        </div>
      ) : null}
      <pre className="max-h-[min(40vh,280px)] overflow-x-auto overflow-y-auto px-3 py-2.5">
        <code className="block font-mono text-[11px] leading-relaxed whitespace-pre text-[#222222]">
          {trimmed}
        </code>
      </pre>
    </div>
  )
}

type Segment =
  | { type: "text"; body: string }
  | { type: "code"; lang?: string; body: string }

function pushCodeSegment(segments: Segment[], lang: string | undefined, body: string) {
  const code = body.replace(/\n+$/, "")
  if (!code.trim()) return
  segments.push({ type: "code", lang: lang?.trim() || undefined, body: code })
}

function splitMarkdownSegments(content: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  FENCE_RE.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = FENCE_RE.exec(content)) !== null) {
    const blockStart = match.index + (match[0][0] === "\n" ? 1 : 0)
    if (blockStart > lastIndex) {
      const text = content.slice(lastIndex, blockStart)
      if (text.trim()) segments.push({ type: "text", body: text })
    }
    const body = match[3] ?? match[2] ?? ""
    pushCodeSegment(segments, match[1], body)
    lastIndex = match.index + match[0].length
  }

  const tail = content.slice(lastIndex)
  if (tail) {
    const open = tail.match(
      /(?:^|\n)\s*```([a-zA-Z0-9+#.-]*)?(?:\s*\r?\n([\s\S]*)|\s*)$/,
    )
    if (open && open.index !== undefined) {
      const before = tail.slice(0, open.index)
      if (before.trim()) segments.push({ type: "text", body: before })
      pushCodeSegment(segments, open[1], open[2] ?? "")
    } else if (tail.trim()) {
      segments.push({ type: "text", body: tail })
    }
  }

  if (segments.length === 0 && content.trim()) {
    segments.push({ type: "text", body: content })
  }

  return segments
}

function ProseMarkdown({ content }: { content: string }) {
  const lines = content.split("\n")
  const nodes: React.ReactNode[] = []
  const listItems: { text: string; ordered: boolean }[] = []
  const tableLines: string[] = []
  let k = 0

  function flushList() {
    if (!listItems.length) return
    const ordered = listItems[0].ordered
    const items = listItems.splice(0)
    nodes.push(
      ordered ? (
        <ol key={k++} className="my-1 list-decimal space-y-0.5 pl-5 text-[13px]">
          {items.map((it, i) => (
            <li key={i} className="pl-0.5 leading-relaxed text-[#333333]">
              {parseInline(it.text)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={k++} className="my-1 space-y-0.5 pl-1 text-[13px]">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 leading-relaxed">
              <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#c0c0c0]" />
              <span className="min-w-0 break-words text-[#333333]">{parseInline(it.text)}</span>
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
      <div key={k++} className="my-2 max-w-full overflow-x-auto rounded-xl border border-[#e5e5e5]">
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
    const trimmed = line.trimStart()
    const assetNode = renderAssetLine(line, k)
    if (assetNode) {
      flushAll()
      const before = line.replace(/\[\[(?:ASSETS|ASSET_LIST)[^\]]+\]\]/g, "").trim()
      if (before) {
        nodes.push(
          <p key={k++} className="break-words text-[13px] leading-relaxed text-[#333333]">
            {parseInline(before)}
          </p>,
        )
      }
      nodes.push(assetNode)
      k++
      continue
    }

    if (trimmed.startsWith("|")) {
      flushList()
      tableLines.push(line)
      continue
    }
    flushTable()

    const h2 = trimmed.match(/^#{1,2}\s+(.+)/)
    const h3 = !h2 && trimmed.match(/^###\s+(.+)/)
    const section =
      !h2 &&
      !h3 &&
      /^[A-Za-z][\w\s\-/]{1,48}:$/.test(trimmed) &&
      !trimmed.startsWith("-")
    const hr = /^---+$/.test(trimmed)
    const ul = trimmed.match(/^[-*]\s+(.+)/)
    const ol = trimmed.match(/^\d+\.\s+(.+)/)

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
    } else if (section) {
      flushList()
      nodes.push(
        <p key={k++} className="mb-0.5 mt-2.5 text-[13px] font-semibold text-[#222222] first:mt-0">
          {trimmed.slice(0, -1)}
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
    } else if (trimmed === "") {
      flushList()
    } else {
      flushList()
      nodes.push(
        <p key={k++} className="break-words text-[13px] leading-relaxed text-[#333333]">
          {parseInline(line)}
        </p>,
      )
    }
  }

  flushAll()
  return <div className="min-w-0 space-y-[3px]">{nodes}</div>
}

export function ChatMarkdownContent({ content }: { content: string }) {
  const segments = splitMarkdownSegments(content)
  let k = 0

  return (
    <div className="min-w-0 max-w-full space-y-[2px]">
      {segments.map((seg) => {
        if (seg.type === "code") {
          return <CodeBlock key={k++} lang={seg.lang} code={seg.body} />
        }
        return <ProseMarkdown key={k++} content={seg.body} />
      })}
    </div>
  )
}
