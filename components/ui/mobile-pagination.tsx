"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export function MobilePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3"
      style={{ border: "1px solid #e5e5e5" }}
    >
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        className="flex size-9 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#717171] transition-opacity disabled:opacity-30 active:bg-[#efefef]"
        style={{ border: "1px solid #e5e5e5" }}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPageChange(i)}
            className={cn("pagination-dot", page === i && "pagination-dot--active")}
            aria-label={`Page ${i + 1}`}
            aria-current={page === i ? "page" : undefined}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={page === totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        className="flex size-9 items-center justify-center rounded-xl bg-[#f7f7f7] text-[#717171] transition-opacity disabled:opacity-30 active:bg-[#efefef]"
        style={{ border: "1px solid #e5e5e5" }}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
