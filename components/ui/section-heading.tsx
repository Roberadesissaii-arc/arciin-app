import Link from "next/link"

/**
 * The same underlined section label the desktop uses.
 *
 * A section-level link belongs on this row, above the rule — "Recent uploads"
 * had its own header inside the section as well, so the phrase appeared twice
 * with the rule stranded between them.
 */
export function SectionHeading({
  children,
  href,
  action,
}: {
  children: React.ReactNode
  href?: string
  action?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#e5e5e5] pb-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a0a0a0]">
        {children}
      </p>
      {href && action ? (
        <Link href={href} className="text-accent text-[12px] font-semibold active:opacity-70">
          {action}
        </Link>
      ) : null}
    </div>
  )
}
