import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder matching `EntryRow` in passwords-page while vault entries load. */
export function PasswordVaultEntrySkeleton() {
  return (
    <li
      className="rounded-2xl bg-white p-4"
      style={{ border: "1px solid #e5e5e5", boxShadow: "0 1px 0 rgba(0,0,0,0.03)" }}
      aria-hidden
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-[58%] max-w-[200px] rounded-md" />
          <Skeleton className="h-3 w-[42%] max-w-[140px] rounded-md" />
        </div>
        <Skeleton className="size-8 shrink-0 rounded-lg" />
      </div>

      <div
        className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ border: "1px solid #ececec", backgroundColor: "#f7f7f7" }}
      >
        <Skeleton className="h-3.5 min-w-0 flex-1 rounded-md" />
        <Skeleton className="size-8 shrink-0 rounded-lg" />
      </div>
    </li>
  )
}

export function PasswordVaultEntryListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <PasswordVaultEntrySkeleton key={i} />
      ))}
    </ul>
  )
}
