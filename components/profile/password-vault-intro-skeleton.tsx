import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder matching the light dashboard intro on passwords-page. */
export function PasswordVaultIntroSkeleton() {
  return (
    <div className="mobile-page-intro" aria-hidden>
      <div className="mobile-page-intro__content">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="mobile-page-intro__subtitle mt-2 h-3 w-56 max-w-full rounded-md" />
        <Skeleton className="mobile-page-intro__description mt-1.5 h-3 w-full max-w-[260px] rounded-md" />
      </div>
      <div className="mobile-page-intro__footer">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
    </div>
  )
}

export function PasswordVaultSearchRowSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <Skeleton className="h-11 min-w-0 flex-1 rounded-2xl" />
      <Skeleton className="size-10 shrink-0 rounded-2xl" />
      <Skeleton className="size-10 shrink-0 rounded-2xl" />
    </div>
  )
}
