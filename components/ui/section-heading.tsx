/**
 * The same underlined section label the desktop uses.
 *
 * The home screen ran four different kinds of block together with nothing
 * separating them, so it read as one long column. A quiet label with a rule
 * under it gives each part a start, which is all that was missing.
 */
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-[#e5e5e5] pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#a0a0a0]">
      {children}
    </p>
  )
}
