import { cn } from "@/lib/utils"

const EQ_BARS = [0.28, 0.44, 0.62, 0.48, 0.72, 0.56, 0.84, 0.64, 0.52, 0.76, 0.58, 0.4, 0.68, 0.5, 0.36] as const

/**
 * Generated cover art for audio assets — matches the desktop Music page
 * (dark card, accent radial glow, grid, static equalizer bars). Audio files
 * have no real thumbnail, so this stands in on the mobile grid and viewer.
 */
export function AudioCardArtwork({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-xl border border-[#27272a] bg-[#09090b]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 100%, color-mix(in srgb, var(--arciin-accent, #ff4f12) 16%, transparent), transparent 65%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[55%] items-end justify-center gap-[3px] px-4 pb-3"
        aria-hidden
      >
        {EQ_BARS.map((height, index) => (
          <span
            key={index}
            className="w-[3px] min-h-[4px] rounded-full"
            style={{
              height: `${Math.round(height * 100)}%`,
              backgroundColor: "color-mix(in srgb, var(--arciin-accent, #ff4f12) 55%, #52525b)",
            }}
          />
        ))}
      </div>
    </div>
  )
}
