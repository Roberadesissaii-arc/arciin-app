"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Loader2, Search } from "lucide-react"

import { searchAssets } from "@/lib/api/assets"
import { formatApiError } from "@/lib/api/errors"
import { filterMobileNavItems, type MobileNavItem } from "@/lib/mobile/navigation-items"
import { useConnection } from "@/components/providers/connection-provider"

function NavResultRow({
  item,
  onSelect,
}: {
  item: MobileNavItem
  onSelect: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:bg-[#f7f7f7]"
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <Icon className="size-4 text-[#717171]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-[#222222]">{item.title}</span>
        <span className="block truncate text-[11px] text-[#a0a0a0]">{item.href}</span>
      </span>
    </button>
  )
}

export function MobileSearch() {
  const router = useRouter()
  const { connection, ready } = useConnection()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [assets, setAssets] = useState<{ id: string; originalFilename: string }[]>([])
  const rootRef = useRef<HTMLDivElement>(null)

  const navItems = filterMobileNavItems(query)

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      setQuery("")
      router.push(href)
    },
    [router],
  )

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  useEffect(() => {
    if (!ready || !connection || query.trim().length < 2) {
      setAssets([])
      setAssetError(null)
      setAssetLoading(false)
      return
    }

    const controller = new AbortController()
    setAssetLoading(true)
    setAssetError(null)

    const timer = window.setTimeout(() => {
      void searchAssets(connection, query, controller.signal)
        .then((rows) => setAssets(rows.slice(0, 6)))
        .catch((err) => {
          if (!controller.signal.aborted) {
            setAssetError(formatApiError(err))
            setAssets([])
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setAssetLoading(false)
        })
    }, 280)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [ready, connection, query])

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <div
        className="flex items-center gap-2 rounded-xl bg-[#f7f7f7] px-3 py-2"
        style={{ border: "1px solid #e5e5e5" }}
      >
        <Search className="size-[15px] shrink-0 text-[#a0a0a0]" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search files, libraries…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[#222222] outline-none placeholder-[#a0a0a0]"
          aria-expanded={open}
          aria-controls="mobile-search-results"
        />
      </div>

      {open ? (
        <div
          id="mobile-search-results"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[min(60vh,320px)] overflow-y-auto rounded-2xl bg-white py-2 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Jump to
          </p>
          {navItems.length ? (
            navItems.map((item) => (
              <NavResultRow key={item.href + item.title} item={item} onSelect={() => go(item.href)} />
            ))
          ) : (
            <p className="px-3 py-2 text-[12px] text-[#a0a0a0]">No pages match.</p>
          )}

          {query.trim().length >= 2 ? (
            <>
              <div className="mx-3 my-2 h-px bg-[#f0f0f0]" />
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#a0a0a0]">
                Files
              </p>
              {assetLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-[#c0c0c0]" />
                </div>
              ) : assetError ? (
                <p className="px-3 py-2 text-[12px] text-[#b91c1c]">{assetError}</p>
              ) : assets.length ? (
                assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => go("/files")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors active:bg-[#f7f7f7]"
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f7f7f7]"
                      style={{ border: "1px solid #e5e5e5" }}
                    >
                      <FileText className="size-4 text-[#717171]" />
                    </span>
                    <span className="min-w-0 truncate text-[13px] font-medium text-[#222222]">
                      {asset.originalFilename}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-[12px] text-[#a0a0a0]">No files match.</p>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
