"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The supplied service card, kept as given.
 *
 * The art is served from /public rather than the original CDN: it is the same
 * four illustrations, downloaded and resized to the 320px the reference URLs
 * themselves requested. That took 6 MB of full-resolution PNG down to 104 KB,
 * and it keeps the cards working on a self-hosted instance with no internet —
 * which is the normal case for this app.
 */

const cardVariants = cva(
  "relative flex flex-col justify-between w-full p-4 overflow-hidden rounded-2xl shadow-sm transition-shadow duration-300 ease-in-out group hover:shadow-lg",
  {
    variants: {
      variant: {
        // All four carry a colour: with default white and secondary grey in the
        // set, two tiles read as empty next to two that do not.
        default: "bg-[#ff4f12] text-white",
        red: "bg-[#e11d48] text-white",
        blue: "bg-[#4f46e5] text-white",
        gray: "bg-[#27272a] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface ServiceCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart">,
    VariantProps<typeof cardVariants> {
  /** The main title of the card. */
  title: string
  /** The URL the card's link should point to. */
  href: string
  /** The source URL for the decorative image. */
  imgSrc: string
  /** The alt text for the decorative image, for accessibility. */
  imgAlt: string
}

const ServiceCard = React.forwardRef<HTMLDivElement, ServiceCardProps>(
  ({ className, variant, title, href, imgSrc, imgAlt, ...props }, ref) => {
    const cardAnimation = {
      hover: {
        scale: 1.02,
        transition: { duration: 0.3 },
      },
    }

    const imageAnimation = {
      hover: {
        scale: 1.1,
        rotate: 3,
        x: 10,
        transition: { duration: 0.4, ease: "easeInOut" as const },
      },
    }

    const arrowAnimation = {
      hover: {
        x: 5,
        transition: {
          duration: 0.3,
          ease: "easeInOut" as const,
          repeat: Infinity,
          repeatType: "reverse" as const,
        },
      },
    }

    return (
      <motion.div
        className={cn(cardVariants({ variant, className }))}
        ref={ref}
        variants={cardAnimation}
        whileHover="hover"
        // A phone has no hover, so the same states are reachable by touch.
        whileTap="hover"
        {...props}
      >
        <div className="relative z-10 flex flex-col h-full">
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          <a
            href={href}
            aria-label={`Learn more about ${title}`}
            className="mt-auto flex items-center text-[12px] font-semibold group-hover:underline"
          >
            LEARN MORE
            <motion.div variants={arrowAnimation}>
              <ArrowRight className="ml-2 h-4 w-4" />
            </motion.div>
          </a>
        </div>

        <motion.img
          src={imgSrc}
          alt={imgAlt}
          className="absolute -right-3 -bottom-3 w-20 h-20 object-contain opacity-90 group-hover:opacity-100"
          variants={imageAnimation}
        />
      </motion.div>
    )
  },
)
ServiceCard.displayName = "ServiceCard"

export { ServiceCard }
