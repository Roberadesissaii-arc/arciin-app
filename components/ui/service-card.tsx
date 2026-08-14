import Link from "next/link"
import type { LucideIcon } from "lucide-react"

/**
 * A coloured tile with its subject drawn behind it.
 *
 * Adapted from the reference component rather than copied. Two things changed
 * for this app, both because it runs on a phone:
 *
 * framer-motion is not used. Every animation in the original is `whileHover`,
 * and a touch screen has no hover — it would have added a library to the bundle
 * for effects nobody here can trigger. The press state is a CSS transition,
 * which is the interaction a phone actually has.
 *
 * The art is local SVG, not a remote URL. This is a self-hosted app that has to
 * work on a LAN with no internet, so cards pointing at someone else's CDN would
 * be blank exactly when the server is doing its job.
 *
 * class-variance-authority is skipped for four fixed variants; a lookup is the
 * same thing without a dependency.
 */

export type ServiceCardVariant = "accent" | "indigo" | "teal" | "slate"

/**
 * Art opacity is per surface, not shared.
 *
 * White line work reads very differently against each of these: at the 22% the
 * reference used it was all but invisible on the orange and the indigo. These
 * are tuned against a render so the drawing is present on every tile without
 * competing with the number, which is what the eye should land on first.
 */
const VARIANTS: Record<ServiceCardVariant, { surface: string; art: string }> = {
  accent: { surface: "bg-[#ff4f12]", art: "opacity-40" },
  indigo: { surface: "bg-[#4f46e5]", art: "opacity-40" },
  teal: { surface: "bg-[#0f766e]", art: "opacity-[0.38]" },
  slate: { surface: "bg-[#27272a]", art: "opacity-[0.30]" },
}

export function ServiceCard({
  label,
  value,
  sub,
  href,
  variant = "slate",
  imgSrc,
  icon: Icon,
  locked = false,
}: {
  label: string
  value: string
  sub?: string
  href: string
  variant?: ServiceCardVariant
  imgSrc: string
  icon?: LucideIcon
  locked?: boolean
}) {
  const { surface, art } = VARIANTS[variant]

  return (
    <Link
      href={href}
      className={`group relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-2xl p-4 transition-transform duration-200 active:scale-[0.98] ${surface}`}
    >
      {/* Bled off the bottom-right corner so the tile reads as cropped artwork
          rather than as an icon sitting in a box. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt=""
        aria-hidden
        className={`pointer-events-none absolute -bottom-7 -right-6 size-32 select-none object-contain transition-transform duration-300 group-active:scale-105 ${art}`}
      />

      <div className="relative z-10 flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 text-white/70" aria-hidden /> : null}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
          {label}
        </span>
      </div>

      <div className="relative z-10">
        <p className="text-[22px] font-bold leading-none tracking-tight text-white">
          {locked ? "—" : value}
        </p>
        {sub ? <p className="mt-1 text-[11px] text-white/65">{sub}</p> : null}
      </div>
    </Link>
  )
}
