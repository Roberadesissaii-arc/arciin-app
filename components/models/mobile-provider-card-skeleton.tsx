import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder matching `MobileProviderCard` layout while models load. */
export function MobileProviderCardSkeleton() {
  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-2xl bg-white"
      style={{ border: "1px solid #e5e5e5" }}
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-28 max-w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="size-5 shrink-0 rounded-full" />
      </div>

      <div className="space-y-1.5 px-4 pb-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[88%]" />
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        <Skeleton className="h-5 w-14 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-lg" />
        <Skeleton className="h-5 w-12 rounded-lg" />
      </div>

      <div className="border-t border-[#f0f0f0] px-4 py-2.5">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function MobileModelsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <MobileProviderCardSkeleton key={i} />
      ))}
    </div>
  )
}
