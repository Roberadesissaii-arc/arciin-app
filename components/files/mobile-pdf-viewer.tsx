"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { BookOpen, Loader2, ScrollText, ZoomIn, ZoomOut } from "lucide-react"

import { fetchPdfDocument } from "@/lib/files/pdf-thumbnail"
import type { MobileConnection } from "@/lib/types/api"

export type PdfViewMode = "scroll" | "book"

type MobilePdfViewerProps = {
  connection: MobileConnection
  assetId: string
  onPageChange?: (page: number, total: number) => void
}

const ZOOM_STEPS = [0.6, 0.85, 1, 1.25, 1.5, 2, 2.75] as const

function PdfPageCanvas({
  pdf,
  pageNumber,
  cssWidth,
}: {
  pdf: PDFDocumentProxy
  pageNumber: number
  cssWidth: number
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [cssHeight, setCssHeight] = useState<number | null>(null)
  const [rendering, setRendering] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host || cssWidth < 1) return
    startedRef.current = false
    setSrc(null)
    setCssHeight(null)

    let cancelled = false
    let objectUrl: string | null = null

    const renderPage = () => {
      if (startedRef.current) return
      startedRef.current = true
      setRendering(true)
      void (async () => {
        try {
          const page = await pdf.getPage(pageNumber)
          const base = page.getViewport({ scale: 1 })
          const fitScale = cssWidth / base.width
          const cssH = Math.floor(base.height * fitScale)
          const pixelRatio = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 3)
          const renderViewport = page.getViewport({ scale: fitScale * pixelRatio })
          const canvas = document.createElement("canvas")
          canvas.width = Math.floor(renderViewport.width)
          canvas.height = Math.floor(renderViewport.height)
          const ctx = canvas.getContext("2d")
          if (!ctx || cancelled) {
            page.cleanup()
            return
          }
          await page.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise
          page.cleanup()
          if (cancelled) return
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/webp", 0.92),
          )
          if (!blob || cancelled) return
          objectUrl = URL.createObjectURL(blob)
          setCssHeight(cssH)
          setSrc(objectUrl)
        } catch {
          /* best-effort */
        } finally {
          if (!cancelled) setRendering(false)
        }
      })()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) renderPage()
      },
      { rootMargin: "320px 0px", threshold: 0.01 },
    )

    observer.observe(host)
    if (hostRef.current) renderPage()

    return () => {
      cancelled = true
      observer.disconnect()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [pageNumber, pdf, cssWidth])

  return (
    <div
      ref={hostRef}
      className="flex shrink-0 justify-center"
      data-pdf-page={pageNumber}
    >
      {src && cssHeight ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Page ${pageNumber}`}
          width={cssWidth}
          height={cssHeight}
          className="block rounded-sm bg-white shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          style={{ width: cssWidth, height: cssHeight }}
          draggable={false}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-sm bg-[#fafafa] text-[11px] text-[#a1a1aa] shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
          style={{ width: cssWidth, minHeight: Math.round(cssWidth * 1.35) }}
        >
          {rendering ? <Loader2 className="size-6 animate-spin text-[#ff4f12]" /> : `Page ${pageNumber}`}
        </div>
      )}
    </div>
  )
}

function PdfToolbar({
  mode,
  onModeChange,
  page,
  total,
  zoomIndex,
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
}: {
  mode: PdfViewMode
  onModeChange: (m: PdfViewMode) => void
  page: number
  total: number
  zoomIndex: number
  onZoomIn: () => void
  onZoomOut: () => void
  canZoomIn: boolean
  canZoomOut: boolean
}) {
  const zoomPct = Math.round(ZOOM_STEPS[zoomIndex]! * 100)

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 px-3 py-1.5"
      style={{
        background: "linear-gradient(180deg, rgba(24,24,27,0.92) 0%, rgba(9,9,11,0.98) 100%)",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="flex rounded-xl bg-white/8 p-0.5">
          <button
            type="button"
            onClick={() => onModeChange("book")}
            className="flex items-center gap-1 rounded-[10px] px-2 py-1 text-[10px] font-semibold transition-colors"
            style={{
              backgroundColor: mode === "book" ? "rgba(255,79,18,0.9)" : "transparent",
              color: mode === "book" ? "#fff" : "#a1a1aa",
            }}
            aria-pressed={mode === "book"}
          >
            <BookOpen className="size-3.5" />
            Book
          </button>
          <button
            type="button"
            onClick={() => onModeChange("scroll")}
            className="flex items-center gap-1 rounded-[10px] px-2 py-1 text-[10px] font-semibold transition-colors"
            style={{
              backgroundColor: mode === "scroll" ? "rgba(255,79,18,0.9)" : "transparent",
              color: mode === "scroll" ? "#fff" : "#a1a1aa",
            }}
            aria-pressed={mode === "scroll"}
          >
            <ScrollText className="size-3.5" />
            Scroll
          </button>
        </div>

        <span className="tabular-nums text-[12px] font-medium text-[#e4e4e7]">
          {total > 0 ? `${page} / ${total}` : "—"}
        </span>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            disabled={!canZoomOut}
            className="flex size-7 items-center justify-center rounded-lg text-[#e4e4e7] active:bg-white/10 disabled:opacity-35"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-3.5" />
          </button>
          <span className="min-w-[2.25rem] text-center text-[10px] font-semibold tabular-nums text-[#a1a1aa]">
            {zoomPct}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            disabled={!canZoomIn}
            className="flex size-7 items-center justify-center rounded-lg text-[#e4e4e7] active:bg-white/10 disabled:opacity-35"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function MobilePdfViewer({
  connection,
  assetId,
  onPageChange,
}: MobilePdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const onPageChangeRef = useRef(onPageChange)
  onPageChangeRef.current = onPageChange

  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewWidth, setViewWidth] = useState(360)
  const [mode, setMode] = useState<PdfViewMode>("book")
  const [bookPage, setBookPage] = useState(1)
  const [zoomIndex, setZoomIndex] = useState(2)
  const [bookAnim, setBookAnim] = useState<"idle" | "left" | "right">("idle")
  const pinchRef = useRef<{ dist: number; index: number } | null>(null)
  const prevModeRef = useRef<PdfViewMode>("book")

  const zoom = ZOOM_STEPS[zoomIndex] ?? 1
  const pageWidth = Math.max(120, Math.floor(viewWidth * zoom))

  useEffect(() => {
    const el = scrollRef.current ?? bookRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setViewWidth(Math.floor(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading, mode])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setNumPages(0)
    setBookPage(1)

    void fetchPdfDocument(connection, assetId)
      .then((pdf) => {
        if (cancelled) {
          void pdf.destroy()
          return
        }
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setLoading(false)
        onPageChangeRef.current?.(1, pdf.numPages)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not open this PDF.")
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      const pdf = pdfRef.current
      pdfRef.current = null
      if (pdf) void pdf.destroy()
    }
  }, [assetId, connection])

  const notifyPage = useCallback((page: number, total: number) => {
    onPageChangeRef.current?.(page, total)
  }, [])

  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)

  const updateScrollPage = useCallback(() => {
    const root = scrollRef.current
    const pdf = pdfRef.current
    if (!root || !pdf || pdf.numPages < 1) return

    const mid = root.scrollTop + root.clientHeight * 0.35
    let best = 1
    let bestDist = Number.POSITIVE_INFINITY
    root.querySelectorAll<HTMLElement>("[data-pdf-page]").forEach((node) => {
      const n = Number(node.dataset.pdfPage)
      if (!n) return
      const dist = Math.abs(node.offsetTop - mid)
      if (dist < bestDist) {
        bestDist = dist
        best = n
      }
    })
    setBookPage(best)
    notifyPage(best, pdf.numPages)
  }, [notifyPage])

  useEffect(() => {
    if (mode !== "scroll" || loading) return
    const root = scrollRef.current
    if (!root) return
    const onScroll = () => updateScrollPage()
    root.addEventListener("scroll", onScroll, { passive: true })
    updateScrollPage()
    return () => root.removeEventListener("scroll", onScroll)
  }, [loading, mode, numPages, updateScrollPage])

  const goBookPage = useCallback(
    (next: number, direction?: "left" | "right") => {
      const pdf = pdfRef.current
      if (!pdf) return
      const clamped = Math.min(Math.max(1, next), pdf.numPages)
      if (clamped === bookPage) return
      if (direction) {
        setBookAnim(direction)
        window.setTimeout(() => setBookAnim("idle"), 220)
      }
      setBookPage(clamped)
      notifyPage(clamped, pdf.numPages)
    },
    [bookPage, notifyPage],
  )

  useEffect(() => {
    if (prevModeRef.current === "book" && mode === "scroll" && !loading && scrollRef.current) {
      const node = scrollRef.current.querySelector<HTMLElement>(`[data-pdf-page="${bookPage}"]`)
      node?.scrollIntoView({ block: "start", behavior: "instant" })
      updateScrollPage()
    }
    prevModeRef.current = mode
  }, [bookPage, loading, mode, updateScrollPage])

  const handleBookTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY
      pinchRef.current = { dist: Math.hypot(dx, dy), index: zoomIndex }
      return
    }
    if (e.touches.length === 1) {
      pinchRef.current = null
    }
  }, [zoomIndex])

  const handleBookTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return
    const dx = e.touches[0]!.clientX - e.touches[1]!.clientX
    const dy = e.touches[0]!.clientY - e.touches[1]!.clientY
    const dist = Math.hypot(dx, dy)
    const ratio = dist / pinchRef.current.dist
    if (ratio > 1.08) {
      setZoomIndex(() => Math.min(ZOOM_STEPS.length - 1, pinchRef.current!.index + 1))
      pinchRef.current = { dist, index: Math.min(ZOOM_STEPS.length - 1, pinchRef.current!.index + 1) }
    } else if (ratio < 0.92) {
      setZoomIndex(() => Math.max(0, pinchRef.current!.index - 1))
      pinchRef.current = { dist, index: Math.max(0, pinchRef.current!.index - 1) }
    }
  }, [])

  const handleTouchEndSwipe = useCallback(
    (e: React.TouchEvent) => {
      pinchRef.current = null
      if (mode !== "book" || e.changedTouches.length !== 1) return
      const touch = e.changedTouches[0]
      const start = swipeStartRef.current
      swipeStartRef.current = null
      if (!touch || !start) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      if (Math.abs(dx) < 56 || Math.abs(dy) > Math.abs(dx) * 0.75) return
      if (dx < 0) goBookPage(bookPage + 1, "left")
      else goBookPage(bookPage - 1, "right")
    },
    [bookPage, goBookPage, mode],
  )

  const handleTouchStartSwipe = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]!
      swipeStartRef.current = { x: t.clientX, y: t.clientY }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex flex-1 items-center justify-center bg-[#111113]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-9 animate-spin text-[#ff4f12]" />
            <p className="text-[12px] text-[#71717a]">Opening document…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !pdfRef.current) {
    return (
      <p className="px-4 py-8 text-center text-[13px] text-[#a1a1aa]">{error ?? "Preview unavailable"}</p>
    )
  }

  const pdf = pdfRef.current

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(255,79,18,0.08) 0%, transparent 55%), #111113",
        }}
      >
        {mode === "book" ? (
          <div
            ref={bookRef}
            className="h-full w-full overflow-auto overscroll-contain touch-pan-x touch-pan-y"
            data-scroll-lock-allow
            onTouchStart={handleBookTouchStart}
            onTouchMove={handleBookTouchMove}
            onTouchEnd={(e) => {
              handleTouchEndSwipe(e)
            }}
            onTouchStartCapture={handleTouchStartSwipe}
          >
            <div className="flex min-h-full min-w-full items-center justify-center p-4 py-6">
              <div
                className="relative transition-[transform,opacity] duration-200 ease-out"
                style={{
                  transform:
                    bookAnim === "left"
                      ? "translateX(-12px)"
                      : bookAnim === "right"
                        ? "translateX(12px)"
                        : "translateX(0)",
                  opacity: bookAnim === "idle" ? 1 : 0.92,
                }}
              >
                <div
                  className="pointer-events-none absolute -inset-3 rounded-lg opacity-40"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,79,18,0.15), transparent 60%)",
                  }}
                />
                <PdfPageCanvas
                  key={`book-${bookPage}-${pageWidth}`}
                  pdf={pdf}
                  pageNumber={bookPage}
                  cssWidth={pageWidth}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="h-full w-full overflow-auto overscroll-contain touch-pan-x touch-pan-y"
            data-scroll-lock-allow
            onTouchStart={handleBookTouchStart}
            onTouchMove={handleBookTouchMove}
            onTouchEnd={() => {
              pinchRef.current = null
            }}
          >
            <div className="mx-auto flex w-full max-w-full flex-col items-center gap-4 py-4">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
                <PdfPageCanvas
                  key={`scroll-${pageNumber}-${pageWidth}`}
                  pdf={pdf}
                  pageNumber={pageNumber}
                  cssWidth={pageWidth}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <PdfToolbar
        mode={mode}
        onModeChange={setMode}
        page={bookPage}
        total={numPages}
        zoomIndex={zoomIndex}
        onZoomIn={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
        onZoomOut={() => setZoomIndex((i) => Math.max(0, i - 1))}
        canZoomIn={zoomIndex < ZOOM_STEPS.length - 1}
        canZoomOut={zoomIndex > 0}
      />
    </div>
  )
}
