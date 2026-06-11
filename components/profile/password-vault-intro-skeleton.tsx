import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder matching the intro vault card on passwords-page. */
export function PasswordVaultIntroSkeleton() {
  return (
    <div className="accent-link-card flex items-center gap-3 rounded-2xl p-4" aria-hidden>
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-28 rounded-md" />
        <Skeleton className="h-2.5 w-[85%] max-w-[240px] rounded-md" />
      </div>
      <Skeleton className="h-8 w-16 shrink-0 rounded-xl" />
    </div>
  )
}
