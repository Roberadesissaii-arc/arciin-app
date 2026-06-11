import Link from "next/link"
import { cn } from "@/lib/utils"

export function AuthMobileLegalFooter({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-end gap-5 px-1 pt-3", className)}>
      <Link
        href="/legal/privacy"
        className="text-[11px] text-[#a0a0a0] underline-offset-4 transition-colors hover:text-[#717171] hover:underline"
      >
        Privacy
      </Link>
      <Link
        href="/legal/terms"
        className="text-[11px] text-[#a0a0a0] underline-offset-4 transition-colors hover:text-[#717171] hover:underline"
      >
        Terms
      </Link>
    </div>
  )
}
