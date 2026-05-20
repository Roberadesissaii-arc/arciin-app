import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder matching the intro vault card on passwords-page. */
export function PasswordVaultIntroSkeleton() {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-4"
      style={{
        border: "1px solid rgba(255,79,18,0.25)",
        background: "linear-gradient(135deg, #fff7f4 0%, #ffffff 70%)",
      }}
      aria-hidden
    >
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-28 rounded-md" />
        <Skeleton className="h-2.5 w-[85%] max-w-[240px] rounded-md" />
      </div>
      <Skeleton className="h-8 w-16 shrink-0 rounded-xl" />
    </div>
  )
}
