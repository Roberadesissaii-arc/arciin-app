"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react"

import { formatMediaDuration } from "@/lib/utils/format-duration"
import { cn } from "@/lib/utils"

function formatTime(seconds: number) {
  return formatMediaDuration(seconds) ?? "0:00"
}

/**
 * Phone-scaled play control: fraction of the shorter video edge so portrait
 * clips keep a small fab and landscape stays balanced — never a desktop-sized disc.
 */
function mobilePlayFabSize(frameW: number, frameH: number): number {
  const shorter = Math.min(frameW || 0, frameH || 0)
  if (shorter <= 0) return 44
  // ~14% of the shorter side, clamped for finger targets without covering the frame.
  return Math.round(Math.min(48, Math.max(36, shorter * 0.14)))
}

function mobilePlayIconSize(fab: number): number {
  return Math.round(fab * 0.42)
}

/**
 * Custom video player for the mobile app:
 * medium-round shell, frosted bar, phone-sized center play (portrait & landscape).
 */
export function MobileVideoPlayer({
  src,
  poster,
  /** True when src is already a local blob: URL (device cache). */
  fromCache = false,
  className,
  onError,
}: {
  src: string
  /** Instant frame from the thumbnail cache while the stream starts. */
  poster?: string | null
  fromCache?: boolean
  className?: string
  onError?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSeekingRef = useRef(false)
  const readyRef = useRef(false)

  const [ready, setReady] = useState(false)
  const [buffering, setBuffering] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seekValue, setSeekValue] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  /** Displayed video frame size — drives proportional play / spinner. */
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 })

  const markReady = useCallback(() => {
    if (readyRef.current) return
    readyRef.current = true
    setReady(true)
  }, [])

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleHideControls = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      const el = videoRef.current
      if (el && !el.paused) setControlsVisible(false)
    }, 2800)
  }, [clearHideTimer])

  const revealControls = useCallback(() => {
    setControlsVisible(true)
    scheduleHideControls()
  }, [scheduleHideControls])

  useEffect(() => () => clearHideTimer(), [clearHideTimer])

  useEffect(() => {
    readyRef.current = false
    // Poster or device cache: show chrome immediately (no multi-second black wait).
    const instant = Boolean(poster) || fromCache || src.startsWith("blob:")
    setReady(instant)
    readyRef.current = instant
    setBuffering(!fromCache && !src.startsWith("blob:"))
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setSeekValue(0)
    setControlsVisible(true)

    // If metadata is slow on a bad network, still reveal chrome so it doesn't
    // feel permanently stuck on a spinner.
    const failOpen = window.setTimeout(() => {
      markReady()
      setBuffering(false)
    }, 10_000)

    return () => window.clearTimeout(failOpen)
  }, [src, poster, fromCache, markReady])

  // Kick the media element so Safari/iOS starts the range request promptly.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    try {
      el.load()
    } catch {
      /* ignore */
    }
  }, [src])

  // Measure the real on-screen video box (portrait vs landscape) for fab sizing.
  const measureFrame = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    const w = el.clientWidth
    const h = el.clientHeight
    if (w > 0 && h > 0) {
      setFrameSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    measureFrame()
    const ro = new ResizeObserver(() => measureFrame())
    ro.observe(el)
    return () => ro.disconnect()
  }, [src, measureFrame, ready])

  useEffect(() => {
    const onFs = () => {
      const anyDoc = document as Document & { webkitFullscreenElement?: Element | null }
      setIsFullscreen(Boolean(document.fullscreenElement || anyDoc.webkitFullscreenElement))
      // Fullscreen changes layout — remeasure after paint.
      requestAnimationFrame(() => measureFrame())
    }
    document.addEventListener("fullscreenchange", onFs)
    document.addEventListener("webkitfullscreenchange", onFs as EventListener)
    return () => {
      document.removeEventListener("fullscreenchange", onFs)
      document.removeEventListener("webkitfullscreenchange", onFs as EventListener)
    }
  }, [measureFrame])

  const playFab = mobilePlayFabSize(frameSize.w, frameSize.h)
  const playIcon = mobilePlayIconSize(playFab)
  const isPortraitFrame = frameSize.h > frameSize.w * 1.05

  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      void el.play().catch(() => setPlaying(false))
    } else {
      el.pause()
    }
    revealControls()
  }, [revealControls])

  const commitSeek = useCallback(
    (value: number) => {
      const el = videoRef.current
      if (!el || !Number.isFinite(duration) || duration <= 0) return
      const next = Math.min(Math.max(0, value), duration)
      el.currentTime = next
      setCurrentTime(next)
      setSeekValue(next)
    },
    [duration],
  )

  const toggleMute = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = !el.muted
    setMuted(el.muted)
    revealControls()
  }, [revealControls])

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current
    if (!shell) return
    try {
      const anyShell = shell as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void
      }
      const anyDoc = document as Document & {
        webkitExitFullscreen?: () => Promise<void> | void
        webkitFullscreenElement?: Element | null
      }
      if (document.fullscreenElement || anyDoc.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if (anyDoc.webkitExitFullscreen) await anyDoc.webkitExitFullscreen()
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen()
      } else if (anyShell.webkitRequestFullscreen) {
        await anyShell.webkitRequestFullscreen()
      }
    } catch {
      /* browser may block fullscreen */
    }
    revealControls()
  }, [revealControls])

  const syncDuration = useCallback((el: HTMLVideoElement) => {
    if (Number.isFinite(el.duration) && el.duration > 0) {
      setDuration(el.duration)
    }
  }, [])

  const sliderMax = duration > 0 ? duration : 0
  const sliderValue = isSeeking ? seekValue : currentTime
  const progressPct =
    sliderMax > 0 ? Math.min(100, (sliderValue / sliderMax) * 100) : 0

  return (
    <div
      className={cn(
        "relative flex h-full w-full max-h-full max-w-full items-center justify-center p-2",
        className,
      )}
      // Keep parent swipe/file-nav from stealing scrubber gestures.
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        ref={shellRef}
        className={cn(
          "group/video relative max-h-full max-w-full overflow-hidden rounded-xl",
          "bg-zinc-950 shadow-[0_4px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/10",
          isFullscreen && "h-full w-full max-h-none max-w-none rounded-none",
        )}
        onPointerMove={revealControls}
        onTouchStart={revealControls}
      >
        <video
          ref={videoRef}
          key={src}
          src={src}
          poster={poster || undefined}
          playsInline
          // Cached blob: buffer aggressively. Network stream: metadata first.
          preload={fromCache || src.startsWith("blob:") ? "auto" : "metadata"}
          className={cn(
            "block max-h-[min(100%,calc(100dvh-11rem))] max-w-full cursor-pointer object-contain",
            isFullscreen && "max-h-full h-full w-full",
          )}
          onClick={togglePlay}
          onLoadStart={() => {
            if (!fromCache && !src.startsWith("blob:")) setBuffering(true)
          }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => {
            markReady()
            setBuffering(false)
          }}
          onCanPlayThrough={() => setBuffering(false)}
          onLoadedData={() => {
            markReady()
            setBuffering(false)
          }}
          onLoadedMetadata={() => {
            const el = videoRef.current
            if (!el) return
            // Metadata is enough to show the player UI — don't wait for a full frame buffer.
            markReady()
            syncDuration(el)
            measureFrame()
            // HAVE_CURRENT_DATA or better → not buffering for first paint.
            if (el.readyState >= 2) setBuffering(false)
          }}
          onDurationChange={() => {
            const el = videoRef.current
            if (el) syncDuration(el)
          }}
          onTimeUpdate={() => {
            const el = videoRef.current
            if (!el || isSeekingRef.current) return
            setCurrentTime(el.currentTime)
            setSeekValue(el.currentTime)
          }}
          onPlay={() => {
            setPlaying(true)
            scheduleHideControls()
          }}
          onPause={() => {
            setPlaying(false)
            setControlsVisible(true)
            clearHideTimer()
          }}
          onEnded={() => {
            setPlaying(false)
            setControlsVisible(true)
          }}
          onVolumeChange={() => {
            const el = videoRef.current
            if (!el) return
            setMuted(el.muted)
            setVolume(el.volume)
          }}
          onError={() => {
            markReady()
            setBuffering(false)
            onError?.()
          }}
        />

        {/* Buffering — spinner scales with frame, not a fixed desktop size */}
        {(!ready || buffering) && !playing ? (
          <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center bg-black/15">
            <Loader2
              className="animate-spin text-white/85"
              style={{ width: playIcon + 4, height: playIcon + 4 }}
              aria-hidden
            />
          </div>
        ) : null}

        {/*
          Phone play fab: circular, size from shorter edge of the video frame.
          Hit area stays full-frame (easy tap); the disc itself stays small so
          portrait clips are not covered by a huge control.
        */}
        {ready && !playing && !buffering ? (
          <button
            type="button"
            className="absolute inset-0 z-[1] flex items-center justify-center bg-transparent active:bg-black/10"
            aria-label="Play"
            onClick={togglePlay}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full",
                "bg-black/45 text-white shadow-md ring-1 ring-white/25 backdrop-blur-md",
                // Slightly tighter on tall portrait so it sits in the “safe” center.
                isPortraitFrame && "translate-y-0",
              )}
              style={{
                width: playFab,
                height: playFab,
              }}
            >
              <Play
                className="translate-x-px"
                style={{ width: playIcon, height: playIcon }}
                fill="currentColor"
              />
            </span>
          </button>
        ) : null}

        {/* Custom control bar — frosted glass (desktop match) */}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/45 via-black/15 to-transparent px-2.5 pb-2.5 pt-10 transition-opacity duration-200",
            controlsVisible || !playing ? "opacity-100" : "opacity-0",
          )}
        >
          <div
            className={cn(
              "pointer-events-auto flex flex-col gap-2 rounded-xl border border-white/15",
              "bg-zinc-950/50 px-2.5 py-2 shadow-lg backdrop-blur-md backdrop-saturate-150",
            )}
          >
            {/* Progress */}
            <div className="relative min-w-0">
              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/15"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-[var(--arciin-accent,#ff4f12)] transition-[width] duration-75"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={sliderMax || 100}
                step={0.05}
                value={sliderMax > 0 ? sliderValue : 0}
                disabled={sliderMax <= 0}
                aria-label="Playback position"
                aria-valuemin={0}
                aria-valuemax={sliderMax}
                aria-valuenow={sliderValue}
                aria-valuetext={`${formatTime(sliderValue)} of ${formatTime(duration)}`}
                className={cn(
                  "relative z-[1] h-5 w-full cursor-pointer appearance-none bg-transparent",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent",
                  "[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                  "[&::-webkit-slider-thumb]:bg-[var(--arciin-accent,#ff4f12)] [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(255,79,18,0.25)]",
                  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent",
                  "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--arciin-accent,#ff4f12)]",
                )}
                onChange={(e) => {
                  const value = Number(e.target.value)
                  isSeekingRef.current = true
                  setIsSeeking(true)
                  setSeekValue(value)
                  revealControls()
                }}
                onPointerUp={() => {
                  commitSeek(seekValue)
                  isSeekingRef.current = false
                  setIsSeeking(false)
                  revealControls()
                }}
                onTouchEnd={() => {
                  commitSeek(seekValue)
                  isSeekingRef.current = false
                  setIsSeeking(false)
                  revealControls()
                }}
                onKeyUp={() => {
                  commitSeek(seekValue)
                  isSeekingRef.current = false
                  setIsSeeking(false)
                }}
                onBlur={() => {
                  if (isSeekingRef.current) {
                    commitSeek(seekValue)
                    isSeekingRef.current = false
                    setIsSeeking(false)
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--arciin-accent,#ff4f12)] text-white active:opacity-90"
                aria-label={playing ? "Pause" : "Play"}
                onClick={togglePlay}
              >
                {playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4 translate-x-px" fill="currentColor" />
                )}
              </button>

              <span className="min-w-[5.25rem] font-mono text-[11px] tabular-nums text-zinc-300">
                {formatTime(sliderValue)}
                <span className="text-zinc-500"> / </span>
                {formatTime(duration)}
              </span>

              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-200 active:bg-white/10"
                  aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
                  onClick={toggleMute}
                >
                  {muted || volume === 0 ? (
                    <VolumeX className="size-4" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </button>

                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-200 active:bg-white/10"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={() => void toggleFullscreen()}
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-4" />
                  ) : (
                    <Maximize2 className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
