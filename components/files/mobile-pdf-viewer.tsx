"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { Loader2 } from "lucide-react"

import { fetchPdfDocument } from "@/lib/files/pdf-thumbnail"
import type { MobileConnection } from "@/lib/types/api"

type MobilePdfViewerProps = {
  connection: MobileConnection
  assetId: string
  onPageChange?: (page: number, total: number) => void
}

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

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || startedRef.current) return
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
      },
      { rootMargin: "240px 0px", threshold: 0.01 },
    )

    observer.observe(host)
    return () => {
      cancelled = true
      observer.disconnect()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [pageNumber, pdf, cssWidth])

  return (
    <div
      ref={hostRef}
      className="flex w-full justify-center bg-[#18181b] py-1"
      data-pdf-page={pageNumber}
    >
      {src && cssHeight ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={cssWidth}
          height={cssHeight}
          className="block max-w-full shadow-sm"
          style={{ width: cssWidth, height: cssHeight }}
          draggable={false}
        />
      ) : (
        <div
          className="flex w-full items-center justify-center bg-[#27272a] text-[11px] text-[#71717a]"
          style={{ minHeight: Math.round(cssWidth * 1.3) }}
        >
          {rendering ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            `Page ${pageNumber}`
          )}
        </div>
      )}
    </div>
  )
}

export function MobilePdfViewer({
  connection,
  assetId,
  onPageChange,
}: MobilePdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const onPageChangeRef = useRef(onPageChange)
  onPageChangeRef.current = onPageChange
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewWidth, setViewWidth] = useState(360)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setViewWidth(Math.floor(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setNumPages(0)

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

  const updateVisiblePage = useCallback(() => {
    const root = scrollRef.current
    const pdf = pdfRef.current
    if (!root || !pdf || pdf.numPages < 1) return

    const mid = root.scrollTop + root.clientHeight * 0.35
    let best = 1
    let bestDist = Number.POSITIVE_INFINITY
    const nodes = root.querySelectorAll<HTMLElement>("[data-pdf-page]")
    nodes.forEach((node) => {
      const n = Number(node.dataset.pdfPage)
      if (!n) return
      const top = node.offsetTop
      const dist = Math.abs(top - mid)
      if (dist < bestDist) {
        bestDist = dist
        best = n
      }
    })
    onPageChangeRef.current?.(best, pdf.numPages)
  }, [])

  useEffect(() => {
    const root = scrollRef.current
    if (!root || loading) return
    const onScroll = () => updateVisiblePage()
    root.addEventListener("scroll", onScroll, { passive: true })
    updateVisiblePage()
    return () => root.removeEventListener("scroll", onScroll)
  }, [loading, numPages, updateVisiblePage])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#71717a]" />
      </div>
    )
  }

  if (error || !pdfRef.current) {
    return (
      <p className="px-4 text-center text-[13px] text-[#a1a1aa]">{error ?? "Preview unavailable"}</p>
    )
  }

  const pdf = pdfRef.current

  return (
    <div
      ref={scrollRef}
      className="h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
      data-scroll-lock-allow
    >
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
        <PdfPageCanvas key={`${pageNumber}-${viewWidth}`} pdf={pdf} pageNumber={pageNumber} cssWidth={viewWidth} />
      ))}
    </div>
  )
}
