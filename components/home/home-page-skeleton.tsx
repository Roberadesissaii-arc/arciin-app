import { Skeleton } from "@/components/ui/skeleton"

function StatCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl bg-white p-4"
      style={{ border: "1px solid #e5e5e5" }}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16 rounded-md" />
        <Skeleton className="size-7 shrink-0 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-[22px] w-10 rounded-md" />
        <Skeleton className="h-2.5 w-20 rounded-md" />
      </div>
    </div>
  )
}

function StorageCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{ backgroundColor: "#0c0c0e", border: "1px solid rgba(255,255,255,0.08)" }}
      aria-hidden
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 shrink-0 rounded-xl bg-white/10" />
          <Skeleton className="h-3.5 w-14 rounded-md bg-white/10" />
        </div>
        <Skeleton className="h-3 w-24 max-w-[55%] rounded-md bg-white/10" />
      </div>
      <Skeleton className="h-2 w-full rounded-full bg-white/10" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-16 rounded-md bg-white/10" />
        <Skeleton className="h-2.5 w-12 rounded-md bg-white/10" />
      </div>
    </div>
  )
}

function ActivityRowSkeleton() {
  return (
    <li className="flex items-start gap-3 px-4 py-3.5" aria-hidden>
      <Skeleton className="mt-0.5 size-8 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-3.5 w-28 max-w-full rounded-md" />
          <Skeleton className="h-2.5 w-14 rounded-md" />
        </div>
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-3 w-[72%] rounded-md" />
      </div>
      <Skeleton className="h-2.5 w-10 shrink-0 rounded-md" />
    </li>
  )
}

/** Full home overview placeholder — matches `HomePage` layout to avoid layout shift. */
export function HomePageSkeleton({ greeting = null }: { greeting?: string | null }) {
  return (
    <div className="flex flex-col gap-5" aria-busy aria-label="Loading overview">
      <div>
        {greeting ? (
          <h2
            className="text-[22px] font-bold tracking-tight text-[#222222]"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            {greeting}
          </h2>
        ) : (
          <Skeleton
            className="h-7 w-40 max-w-full rounded-lg"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          />
        )}
        <div className="mt-1.5">
          <Skeleton className="h-3.5 w-44 max-w-full rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <StorageCardSkeleton />

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-md" />
            <Skeleton className="h-3.5 w-28 rounded-md" />
          </div>
          <Skeleton className="h-3 w-14 rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-xl bg-[#ececec]"
              style={{ border: "1px solid #e5e5e5" }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Skeleton className="size-4 rounded-md" />
          <Skeleton className="h-3.5 w-24 rounded-md" />
        </div>
        <div
          className="overflow-hidden rounded-2xl bg-white"
          style={{ border: "1px solid #e5e5e5" }}
        >
          <ul className="divide-y divide-[#f0f0f0]">
            <ActivityRowSkeleton />
            <ActivityRowSkeleton />
            <ActivityRowSkeleton />
            <ActivityRowSkeleton />
          </ul>
        </div>
      </div>
    </div>
  )
}

